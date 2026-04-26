using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Infrastructure.Alerts;

public class AlertEvaluationService : IAlertEvaluationService
{
    private readonly IApplicationDbContext _mainDb;
    private readonly IChatBotDbContext _alertDb;

    public AlertEvaluationService(IApplicationDbContext mainDb, IChatBotDbContext alertDb)
    {
        _mainDb = mainDb;
        _alertDb = alertDb;
    }

    public async Task<AlertEvaluationResult> EvaluateAsync(AlertConfiguration config, CancellationToken ct = default)
    {
        var definition = config.AlertDefinition;
        if (definition == null)
        {
            return new AlertEvaluationResult(false, 0, "Định nghĩa cảnh báo chưa được tải.");
        }

        var effectiveNow = await _mainDb.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;

        return definition.Code switch
        {
            "SALES_REVENUE_DECLINE" => await EvaluateSalesRevenueDeclineAsync(config, effectiveNow, ct),
            "SALES_ORDER_COUNT_DECLINE" => await EvaluateSalesOrderCountDeclineAsync(config, effectiveNow, ct),
            "SALES_TOP_PRODUCT_CHANGE" => await EvaluateSalesTopProductChangeAsync(config, effectiveNow, ct),
            "SALES_ORDER_STATUS_ISSUE" => await EvaluateSalesOrderStatusIssueAsync(config, effectiveNow, ct),
            "SALES_CUSTOMER_CONCENTRATION" => await EvaluateCustomerConcentrationAsync(config, effectiveNow, ct),
            _ => new AlertEvaluationResult(false, 0, $"Mã cảnh báo không xác định: {definition.Code}")
        };
    }

    private async Task<AlertEvaluationResult> EvaluateSalesRevenueDeclineAsync(
        AlertConfiguration config, DateTime effectiveNow, CancellationToken ct)
    {
        var scanDays = config.ScanIntervalDays;
        var threshold = config.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold ?? 10m;
        var currentPeriodStart = effectiveNow.AddDays(-scanDays);
        var previousPeriodStart = currentPeriodStart.AddDays(-scanDays);

        var currentRevenue = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentPeriodStart && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;

        var previousRevenue = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousPeriodStart && o.OrderDate < currentPeriodStart && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;

        if (previousRevenue == 0)
        {
            return new AlertEvaluationResult(false, 0, "Không có dữ liệu kỳ trước để so sánh.");
        }

        var changePercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100m;

        if (changePercent < -threshold)
        {
            return new AlertEvaluationResult(
                true,
                changePercent,
                $"Doanh thu {scanDays} ngày: ${currentRevenue:N0} (giảm {changePercent:N1}% so với kỳ trước). Vượt ngưỡng -{threshold:N0}%."
            );
        }

        return new AlertEvaluationResult(
            false,
            changePercent,
            $"Doanh thu {scanDays} ngày: ${currentRevenue:N0} ({changePercent.ToString("+0.0;-0.0;0")}% so với kỳ trước). Không vượt ngưỡng -{threshold:N0}%."
        );
    }

    private async Task<AlertEvaluationResult> EvaluateSalesOrderCountDeclineAsync(
        AlertConfiguration config, DateTime effectiveNow, CancellationToken ct)
    {
        var scanDays = config.ScanIntervalDays;
        var threshold = config.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold ?? 10m;
        var currentPeriodStart = effectiveNow.AddDays(-scanDays);
        var previousPeriodStart = currentPeriodStart.AddDays(-scanDays);

        var currentCount = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentPeriodStart && o.OrderDate <= effectiveNow && o.Status != 6)
            .CountAsync(ct);

        var previousCount = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousPeriodStart && o.OrderDate < currentPeriodStart && o.Status != 6)
            .CountAsync(ct);

        if (previousCount == 0)
        {
            return new AlertEvaluationResult(false, 0, "Không có dữ liệu kỳ trước để so sánh.");
        }

        var changePercent = ((decimal)(currentCount - previousCount) / previousCount) * 100m;

        if (changePercent < -threshold)
        {
            return new AlertEvaluationResult(
                true,
                changePercent,
                $"Số đơn hàng {scanDays} ngày: {currentCount:N0} (giảm {changePercent:N1}% so với kỳ trước). Vượt ngưỡng -{threshold:N0}%."
            );
        }

        return new AlertEvaluationResult(
            false,
            changePercent,
            $"Số đơn hàng {scanDays} ngày: {currentCount:N0} ({changePercent.ToString("+0.0;-0.0;0")}% so với kỳ trước). Không vượt ngưỡng -{threshold:N0}%."
        );
    }

    private async Task<AlertEvaluationResult> EvaluateSalesTopProductChangeAsync(
        AlertConfiguration config, DateTime effectiveNow, CancellationToken ct)
    {
        var scanDays = config.ScanIntervalDays;
        var currentPeriodStart = effectiveNow.AddDays(-scanDays);
        var previousPeriodStart = currentPeriodStart.AddDays(-scanDays);

        var currentTopProducts = await _mainDb.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= currentPeriodStart && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
            .GroupBy(d => d.ProductId)
            .Select(g => new { ProductId = g.Key, TotalRevenue = g.Sum(d => d.LineTotal) })
            .OrderByDescending(p => p.TotalRevenue)
            .Take(5)
            .Select(p => p.ProductId)
            .ToListAsync(ct);

        var previousTopProducts = await _mainDb.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= previousPeriodStart && d.SalesOrder!.OrderDate < currentPeriodStart && d.SalesOrder!.Status != 6)
            .GroupBy(d => d.ProductId)
            .Select(g => new { ProductId = g.Key, TotalRevenue = g.Sum(d => d.LineTotal) })
            .OrderByDescending(p => p.TotalRevenue)
            .Take(5)
            .Select(p => p.ProductId)
            .ToListAsync(ct);

        var changedCount = currentTopProducts.Count(p => !previousTopProducts.Contains(p));

        if (changedCount > 0)
        {
            return new AlertEvaluationResult(
                true,
                changedCount,
                $"Top sản phẩm bán chạy thay đổi: có {changedCount}/5 sản phẩm mới trong {scanDays} ngày."
            );
        }

        return new AlertEvaluationResult(
            false,
            changedCount,
            "Top sản phẩm bán chạy ổn định."
        );
    }

    private async Task<AlertEvaluationResult> EvaluateSalesOrderStatusIssueAsync(
        AlertConfiguration config, DateTime effectiveNow, CancellationToken ct)
    {
        var scanDays = config.ScanIntervalDays;
        var threshold = config.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold ?? 20m;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var totalOrders = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow)
            .CountAsync(ct);

        var rejectedOrCancelled = await _mainDb.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);

        if (totalOrders == 0)
        {
            return new AlertEvaluationResult(false, 0, "Không có đơn hàng trong kỳ.");
        }

        var issueRate = ((decimal)rejectedOrCancelled / totalOrders) * 100m;

        if (issueRate > threshold)
        {
            return new AlertEvaluationResult(
                true,
                issueRate,
                $"Tỷ lệ đơn hàng bị từ chối/hủy: {issueRate:N1}% (vượt ngưỡng {threshold:N0}%). {rejectedOrCancelled}/{totalOrders} đơn."
            );
        }

        return new AlertEvaluationResult(
            false,
            issueRate,
            $"Tỷ lệ đơn hàng có vấn đề: {issueRate:N1}%."
        );
    }

    private async Task<AlertEvaluationResult> EvaluateCustomerConcentrationAsync(
        AlertConfiguration config, DateTime effectiveNow, CancellationToken ct)
    {
        var scanDays = config.ScanIntervalDays;
        var threshold = config.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold ?? 30m;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var totalRevenue = await _mainDb.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= cutoff && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
            .SumAsync(d => (decimal?)d.LineTotal, ct) ?? 0m;

        if (totalRevenue == 0)
        {
            return new AlertEvaluationResult(false, 0, "Không có doanh thu trong kỳ.");
        }

        var topCustomerRevenue = await _mainDb.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= cutoff && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
            .GroupBy(d => d.SalesOrder!.CustomerId)
            .Select(g => g.Sum(d => d.LineTotal))
            .OrderByDescending(r => r)
            .FirstAsync(ct);

        var concentration = (topCustomerRevenue / totalRevenue) * 100m;

        if (concentration > threshold)
        {
            return new AlertEvaluationResult(
                true,
                concentration,
                $"Khách hàng top 1 chiếm {concentration:N1}% doanh thu (vượt ngưỡng {threshold:N0}%). Cảnh báo phụ thuộc quá mức vào 1 khách hàng."
            );
        }

        return new AlertEvaluationResult(
            false,
            concentration,
            $"Khách hàng top 1 chiếm {concentration:N1}% doanh thu."
        );
    }
}
