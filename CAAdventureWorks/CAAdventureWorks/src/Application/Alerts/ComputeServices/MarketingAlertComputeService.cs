using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class MarketingAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Marketing";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);
        var previousCutoff = cutoff.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Campaign ROI - revenue per customer
        var currentRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var previousRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousCutoff && o.OrderDate < cutoff && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var currentCustomers = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .Select(o => o.CustomerId).Distinct().CountAsync(ct);
        var roi = currentCustomers > 0 ? (currentRevenue / currentCustomers) : 0m;
        values["CAMPAIGN_ROI"] = currentCustomers;
        messages["CAMPAIGN_ROI"] = $"Doanh thu TB/khách: ${roi:N0} ({currentCustomers} khách hàng)";

        // Lead conversion - new customers
        var newCustomerOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6 && o.SalesOrderNumber!.StartsWith("SO-1"))
            .CountAsync(ct);
        var totalOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .CountAsync(ct);
        var conversionRate = totalOrders > 0 ? ((decimal)newCustomerOrders / totalOrders) * 100m : 0m;
        values["LEAD_CONVERSION"] = conversionRate;
        messages["LEAD_CONVERSION"] = $"Tỷ lệ khách hàng mới: {conversionRate:N1}% ({newCustomerOrders}/{totalOrders})";

        // Website traffic proxy - order count
        values["WEBSITE_TRAFFIC"] = totalOrders;
        messages["WEBSITE_TRAFFIC"] = $"Số đơn hàng (proxy cho traffic): {totalOrders}";

        // Social engagement - average order value
        var avgOrderValue = totalOrders > 0 ? currentRevenue / totalOrders : 0m;
        values["SOCIAL_ENGAGEMENT"] = avgOrderValue;
        messages["SOCIAL_ENGAGEMENT"] = $"Giá trị đơn TB: ${avgOrderValue:N0}";

        return new DepartmentAlertMetrics("Marketing", values, messages);
    }
}
