using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class FacilitiesAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "Facilities";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Work order backlog - work orders with delays
        var totalWorkOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        var delayedWorkOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate > w.DueDate)
            .CountAsync(ct);
        values["WORKORDER_BACKLOG"] = delayedWorkOrders;
        messages["WORKORDER_BACKLOG"] = $"Lệnh sửa chữa tồn đọng: {delayedWorkOrders}";

        // Equipment failure - work orders with scrap
        var equipmentFailure = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.ScrapReasonId != null)
            .CountAsync(ct);
        values["EQUIPMENT_FAILURE"] = equipmentFailure;
        messages["EQUIPMENT_FAILURE"] = $"Sự cố thiết bị: {equipmentFailure}";

        // Utility cost - total production cost
        var totalCost = await db.WorkOrderRoutings
            .Where(r => r.WorkOrder!.StartDate >= cutoff && r.WorkOrder!.StartDate <= effectiveNow)
            .SumAsync(r => (decimal?)r.ActualResourceHrs, ct) ?? 0m;
        values["UTILITY_COST"] = totalCost;
        messages["UTILITY_COST"] = $"Chi phí sản xuất: ${totalCost:N0}";

        // Safety incident - no direct data
        values["SAFETY_INCIDENT"] = 0m;
        messages["SAFETY_INCIDENT"] = "Không có sự cố an toàn được ghi nhận";

        return new DepartmentAlertMetrics("Facilities", values, messages);
    }
}
