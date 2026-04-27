using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class ToolDesignAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "ToolDesign";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.WorkOrders
            .MaxAsync(w => (DateTime?)w.StartDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Tool revision - products with recent modifications
        var productModifications = await db.Products
            .Where(p => p.ModifiedDate >= cutoff && p.ModifiedDate <= effectiveNow)
            .CountAsync(ct);
        values["REVISION_RATE"] = productModifications;
        messages["REVISION_RATE"] = $"Sản phẩm được sửa đổi: {productModifications}";

        // Tool delivery - work orders delayed
        var delayedOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate > w.DueDate)
            .CountAsync(ct);
        var totalOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        var deliveryRate = totalOrders > 0 ? (100m - ((decimal)delayedOrders / totalOrders) * 100m) : 100m;
        values["DELIVERY_DELAY"] = deliveryRate;
        messages["DELIVERY_DELAY"] = $"Tỷ lệ giao đúng hạn: {deliveryRate:N1}% ({totalOrders - delayedOrders}/{totalOrders})";

        // Cost overrun - using standard cost vs list price variance
        var avgCost = await db.Products
            .Where(p => p.ModifiedDate >= cutoff && p.ModifiedDate <= effectiveNow)
            .AverageAsync(p => (decimal?)p.StandardCost, ct) ?? 0m;
        values["COST_OVERRUN"] = avgCost;
        messages["COST_OVERRUN"] = $"Chi phí TB khuôn: ${avgCost:N2}";

        return new DepartmentAlertMetrics("ToolDesign", values, messages);
    }
}
