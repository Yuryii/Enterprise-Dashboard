using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class FinanceAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Finance";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Revenue as proxy for budget
        var currentRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var expectedRevenue = currentRevenue * 1.1m; // 10% above as budget target
        var budgetVariance = expectedRevenue > 0 ? ((currentRevenue / expectedRevenue) - 1m) * 100m : 0m;
        values["BUDGET_VARIANCE"] = budgetVariance;
        messages["BUDGET_VARIANCE"] = $"Chênh lệch ngân sách: {budgetVariance:+0.0;-0.0;0}%";

        // Overdue payments - rejected/cancelled orders as proxy
        var totalOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var overdueOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);
        var overdueRate = totalOrders > 0 ? ((decimal)overdueOrders / totalOrders) * 100m : 0m;
        values["OVERDUE_PAYMENT"] = overdueRate;
        messages["OVERDUE_PAYMENT"] = $"Tỷ lệ đơn hàng có vấn đề thanh toán: {overdueRate:N1}%";

        // AR Aging - use order totals as proxy
        var totalDue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        values["AR_AGING"] = 15m;
        messages["AR_AGING"] = $"Công nợ phải thu: ${totalDue:N0}";

        // Credit limit - average order value
        var avgOrderValue = totalOrders > 0 ? totalDue / totalOrders : 0m;
        values["CREDIT_LIMIT"] = avgOrderValue;
        messages["CREDIT_LIMIT"] = $"Giá trị đơn TB: ${avgOrderValue:N0}";

        return new DepartmentAlertMetrics("Finance", values, messages);
    }
}
