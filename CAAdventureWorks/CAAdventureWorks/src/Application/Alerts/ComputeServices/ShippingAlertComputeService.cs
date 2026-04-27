using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class ShippingAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "ShippingAndReceiving";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.PurchaseOrderHeaders
            .MaxAsync(p => (DateTime?)p.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Ship delay - POs shipped late
        var totalPOs = await db.PurchaseOrderHeaders
            .Where(p => p.OrderDate >= cutoff && p.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var latePOs = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow && d.PurchaseOrder!.ShipDate != null && d.PurchaseOrder!.ShipDate > d.DueDate)
            .CountAsync(ct);
        var delayRate = totalPOs > 0 ? ((decimal)latePOs / totalPOs) * 100m : 0m;
        values["SHIP_DELAY_RATE"] = delayRate;
        messages["SHIP_DELAY_RATE"] = $"Tỷ lệ giao trễ: {delayRate:N1}% ({latePOs}/{totalPOs})";

        // Return rate - rejected POs
        var rejectedPOs = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow && d.RejectedQty > 0)
            .SumAsync(d => (decimal?)d.RejectedQty, ct) ?? 0m;
        values["RETURN_RATE"] = rejectedPOs;
        messages["RETURN_RATE"] = $"Số lượng hàng bị trả lại: {rejectedPOs}";

        // Receiving backlog - POs not yet received
        var notReceived = await db.PurchaseOrderHeaders
            .Where(p => p.OrderDate >= cutoff && p.OrderDate <= effectiveNow && p.ShipDate == null)
            .CountAsync(ct);
        values["RECEIVING_BACKLOG"] = notReceived;
        messages["RECEIVING_BACKLOG"] = $"PO chưa nhận hàng: {notReceived}";

        // Damage rate - products with rejected qty
        var totalReceived = await db.PurchaseOrderDetails
            .Where(d => d.PurchaseOrder!.OrderDate >= cutoff && d.PurchaseOrder!.OrderDate <= effectiveNow)
            .SumAsync(d => (decimal?)d.ReceivedQty, ct) ?? 0m;
        var damageRate = totalReceived > 0 ? ((decimal)rejectedPOs / totalReceived) * 100m : 0m;
        values["DAMAGE_RATE"] = damageRate;
        messages["DAMAGE_RATE"] = $"Tỷ lệ hư hỏng: {damageRate:N2}% ({rejectedPOs}/{totalReceived})";

        return new DepartmentAlertMetrics("ShippingAndReceiving", values, messages);
    }
}
