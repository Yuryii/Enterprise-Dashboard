using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class SalesAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Sales";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;

        var currentStart = effectiveNow.AddDays(-scanDays);
        var previousStart = currentStart.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Revenue
        var currentRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentStart && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var previousRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousStart && o.OrderDate < currentStart && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100m : 0m;
        values["REVENUE_CHANGE"] = revenueChange;
        messages["REVENUE_CHANGE"] = $"Doanh thu {scanDays} ngày: ${currentRevenue:N0} ({revenueChange:+0.0;-0.0;0}% so với kỳ trước)";

        // Order count
        var currentCount = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentStart && o.OrderDate <= effectiveNow && o.Status != 6)
            .CountAsync(ct);
        var previousCount = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousStart && o.OrderDate < currentStart && o.Status != 6)
            .CountAsync(ct);
        var countChange = previousCount > 0 ? ((decimal)(currentCount - previousCount) / previousCount) * 100m : 0m;
        values["ORDER_COUNT_CHANGE"] = countChange;
        messages["ORDER_COUNT_CHANGE"] = $"Số đơn hàng: {currentCount:N0} ({countChange:+0.0;-0.0;0}% so với kỳ trước)";

        // Top product change
        var currentTop = await db.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= currentStart && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
            .GroupBy(d => d.ProductId)
            .Select(g => new { ProductId = g.Key, TotalRevenue = g.Sum(d => d.LineTotal) })
            .OrderByDescending(p => p.TotalRevenue).Take(5).Select(p => p.ProductId)
            .ToListAsync(ct);
        var previousTop = await db.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= previousStart && d.SalesOrder!.OrderDate < currentStart && d.SalesOrder!.Status != 6)
            .GroupBy(d => d.ProductId)
            .Select(g => new { ProductId = g.Key, TotalRevenue = g.Sum(d => d.LineTotal) })
            .OrderByDescending(p => p.TotalRevenue).Take(5).Select(p => p.ProductId)
            .ToListAsync(ct);
        var changedCount = currentTop.Count(p => !previousTop.Contains(p));
        values["TOP_PRODUCT_CHANGE"] = changedCount;
        messages["TOP_PRODUCT_CHANGE"] = $"Top sản phẩm: {changedCount}/5 sản phẩm mới trong {scanDays} ngày";

        // Order status issue
        var totalOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentStart && o.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var rejectedOrCancelled = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= currentStart && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);
        var issueRate = totalOrders > 0 ? ((decimal)rejectedOrCancelled / totalOrders) * 100m : 0m;
        values["ORDER_STATUS_ISSUE"] = issueRate;
        messages["ORDER_STATUS_ISSUE"] = $"Tỷ lệ đơn hàng có vấn đề: {issueRate:N1}% ({rejectedOrCancelled}/{totalOrders})";

        // Customer concentration
        var totalRevenue = await db.SalesOrderDetails
            .Where(d => d.SalesOrder!.OrderDate >= currentStart && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
            .SumAsync(d => (decimal?)d.LineTotal, ct) ?? 0m;
        if (totalRevenue > 0)
        {
            var topCustomerRevenue = await db.SalesOrderDetails
                .Where(d => d.SalesOrder!.OrderDate >= currentStart && d.SalesOrder!.OrderDate <= effectiveNow && d.SalesOrder!.Status != 6)
                .GroupBy(d => d.SalesOrder!.CustomerId)
                .Select(g => g.Sum(d => d.LineTotal))
                .OrderByDescending(r => r).FirstOrDefaultAsync(ct);
            var concentration = (topCustomerRevenue / totalRevenue) * 100m;
            values["CUSTOMER_CONCENTRATION"] = concentration;
            messages["CUSTOMER_CONCENTRATION"] = $"Khách hàng top 1 chiếm {concentration:N1}% doanh thu";
        }
        else
        {
            values["CUSTOMER_CONCENTRATION"] = 0m;
            messages["CUSTOMER_CONCENTRATION"] = "Không có doanh thu trong kỳ";
        }

        return new DepartmentAlertMetrics("Sales", values, messages);
    }
}
