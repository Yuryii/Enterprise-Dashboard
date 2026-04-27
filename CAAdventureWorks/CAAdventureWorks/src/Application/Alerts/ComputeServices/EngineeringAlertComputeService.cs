using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class EngineeringAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Engineering";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.WorkOrders
            .MaxAsync(w => (DateTime?)w.StartDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Project delay - work orders with delays
        var delayedOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate > w.DueDate)
            .CountAsync(ct);
        var totalOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        values["PROJECT_DELAY"] = delayedOrders;
        messages["PROJECT_DELAY"] = $"Lệnh trễ tiến độ: {delayedOrders}/{totalOrders}";

        // Change orders - modified products
        var productCount = await db.Products
            .Where(p => p.ModifiedDate >= cutoff && p.ModifiedDate <= effectiveNow)
            .CountAsync(ct);
        values["CHANGE_ORDER_RATE"] = productCount;
        messages["CHANGE_ORDER_RATE"] = $"Sản phẩm được cập nhật/thay đổi: {productCount}";

        // Document revision - products with list price changes
        var priceChanges = await db.ProductListPriceHistories
            .Where(h => h.StartDate >= cutoff && h.StartDate <= effectiveNow)
            .CountAsync(ct);
        values["DOCUMENT_REVISION"] = priceChanges;
        messages["DOCUMENT_REVISION"] = $"Số lần thay đổi giá sản phẩm: {priceChanges}";

        return new DepartmentAlertMetrics("Engineering", values, messages);
    }
}
