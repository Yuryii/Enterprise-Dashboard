using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class ProductionAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Production";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.WorkOrders
            .MaxAsync(w => (DateTime?)w.StartDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Scrap rate
        var scrapReasonCount = await db.WorkOrderRoutings
            .Where(r => r.WorkOrder!.StartDate >= cutoff && r.WorkOrder!.StartDate <= effectiveNow)
            .SumAsync(r => r.ActualResourceHrs ?? 0m, ct);
        var totalProductionTime = await db.WorkOrderRoutings
            .Where(r => r.WorkOrder!.StartDate >= cutoff && r.WorkOrder!.StartDate <= effectiveNow)
            .SumAsync(r => r.ActualResourceHrs ?? 0m, ct);
        var scrapRate = totalProductionTime > 0 ? (scrapReasonCount / totalProductionTime) * 100m : 0m;
        values["SCRAP_RATE"] = scrapRate;
        messages["SCRAP_RATE"] = $"Tỷ lệ phế phẩm: {scrapRate:N2}%";

        // Work order delays - completed vs total
        var totalWorkOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        var completedWorkOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate <= w.DueDate)
            .CountAsync(ct);
        var delayRate = totalWorkOrders > 0 ? (100m - ((decimal)completedWorkOrders / totalWorkOrders) * 100m) : 0m;
        values["WORKORDER_DELAY"] = delayRate;
        messages["WORKORDER_DELAY"] = $"Tỷ lệ lệnh trễ: {delayRate:N1}% ({totalWorkOrders - completedWorkOrders}/{totalWorkOrders})";

        // Machine downtime - count work orders with unexpected delays
        var workOrdersWithDelay = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate > w.DueDate)
            .CountAsync(ct);
        values["MACHINE_DOWNTIME"] = workOrdersWithDelay;
        messages["MACHINE_DOWNTIME"] = $"Số lệnh sản xuất trễ: {workOrdersWithDelay}";

        // Inventory - product inventory levels
        var lowStockCount = await db.ProductInventories
            .Where(i => i.Location!.LocationId == 6) // Final Goods location
            .SumAsync(i => (int?)i.Quantity, ct) ?? 0;
        values["INVENTORY_LOW"] = lowStockCount;
        messages["INVENTORY_LOW"] = $"Tồn kho thành phẩm: {lowStockCount:N0} đơn vị";

        return new DepartmentAlertMetrics("Production", values, messages);
    }
}
