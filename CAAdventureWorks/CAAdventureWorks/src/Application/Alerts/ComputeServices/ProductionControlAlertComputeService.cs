using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class ProductionControlAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "ProductionControl";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.WorkOrders
            .MaxAsync(w => (DateTime?)w.StartDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Schedule adherence
        var totalOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        var onTimeOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate != null && w.EndDate <= w.DueDate)
            .CountAsync(ct);
        var adherenceRate = totalOrders > 0 ? ((decimal)onTimeOrders / totalOrders) * 100m : 0m;
        values["SCHEDULE_ADHERENCE"] = adherenceRate;
        messages["SCHEDULE_ADHERENCE"] = $"Tuân thủ lịch: {adherenceRate:N1}% ({onTimeOrders}/{totalOrders})";

        // WIP levels - work orders in progress
        var wipOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.EndDate == null)
            .CountAsync(ct);
        values["WIP_HIGH"] = wipOrders;
        messages["WIP_HIGH"] = $"Sản phẩm dở dang: {wipOrders} lệnh";

        // Cycle time - compare current vs completed
        var avgCycleTime = await db.WorkOrderRoutings
            .Where(r => r.WorkOrder!.StartDate >= cutoff && r.WorkOrder!.StartDate <= effectiveNow)
            .AverageAsync(r => (decimal?)r.ActualResourceHrs, ct) ?? 0m;
        var stdCycleTime = await db.WorkOrderRoutings
            .AverageAsync(r => (decimal?)r.ActualResourceHrs, ct) ?? 0m;
        var cycleTimeChange = stdCycleTime > 0 ? (((avgCycleTime - stdCycleTime) / stdCycleTime) * 100m) : 0m;
        values["CYCLE_TIME"] = cycleTimeChange;
        messages["CYCLE_TIME"] = $"Thời gian chu kỳ TB: {avgCycleTime:N2}h ({cycleTimeChange:+0.0;-0.0;0}% so với TB)";

        return new DepartmentAlertMetrics("ProductionControl", values, messages);
    }
}
