using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class PurchasingAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Purchasing";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.PurchaseOrderHeaders
            .MaxAsync(p => (DateTime?)p.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // PO delay rate
        var totalPOs = await db.PurchaseOrderHeaders
            .Where(p => p.OrderDate >= cutoff && p.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var delayedPOs = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow && d.PurchaseOrder!.ShipDate != null && d.PurchaseOrder!.ShipDate > d.DueDate)
            .CountAsync(ct);
        var delayRate = totalPOs > 0 ? ((decimal)delayedPOs / totalPOs) * 100m : 0m;
        values["PO_DELAY"] = delayRate;
        messages["PO_DELAY"] = $"Tỷ lệ PO trễ: {delayRate:N1}% ({delayedPOs}/{totalPOs})";

        // Vendor performance - orders received on time
        var receivedOnTime = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow && d.PurchaseOrder!.ShipDate != null && d.PurchaseOrder!.ShipDate <= d.DueDate)
            .CountAsync(ct);
        var vendorPerf = totalPOs > 0 ? ((decimal)receivedOnTime / totalPOs) * 100m : 0m;
        values["VENDOR_PERF"] = vendorPerf;
        messages["VENDOR_PERF"] = $"Nhà cung cấp đúng hạn: {vendorPerf:N1}% ({receivedOnTime}/{totalPOs})";

        // Stockout - products below reorder point
        var stockoutCount = await db.ProductVendors
            .Where(pv => pv.Product!.ProductInventories!.Any(i => i.Quantity < pv.Product!.SafetyStockLevel))
            .Select(pv => pv.ProductId)
            .Distinct()
            .CountAsync(ct);
        values["STOCKOUT"] = stockoutCount;
        messages["STOCKOUT"] = $"Sản phẩm dưới điểm tái đặt: {stockoutCount}";

        // Price variance
        var avgUnitPrice = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow)
            .AverageAsync(d => (decimal?)d.UnitPrice, ct) ?? 0m;
        values["PRICE_VARIANCE"] = avgUnitPrice;
        messages["PRICE_VARIANCE"] = $"Giá mua TB: ${avgUnitPrice:N2}";

        return new DepartmentAlertMetrics("Purchasing", values, messages);
    }
}
