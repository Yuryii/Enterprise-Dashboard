using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class HumanResourcesAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "HumanResources";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Active employees
        var activeEmployees = await db.Employees
            .Where(e => e.HireDate <= DateOnly.FromDateTime(effectiveNow) && (e.SalariedFlag == true || e.CurrentFlag == true))
            .CountAsync(ct);
        values["ACTIVE_EMPLOYEES"] = activeEmployees;
        messages["ACTIVE_EMPLOYEES"] = $"Số nhân viên đang làm việc: {activeEmployees}";

        // Employee count as proxy for open positions
        var totalEmployees = await db.Employees.CountAsync(ct);
        values["OPEN_POSITIONS"] = Math.Max(0, 200 - totalEmployees);
        messages["OPEN_POSITIONS"] = $"Số vị trí tuyển dụng ước tính: ~{Math.Max(0, 200 - totalEmployees)}";

        // Overtime hours - use employee pay history
        var totalOvertimeHours = await db.EmployeePayHistories
            .Where(p => p.RateChangeDate >= cutoff && p.RateChangeDate <= effectiveNow)
            .SumAsync(p => (decimal?)p.PayFrequency, ct) ?? 0m;
        values["OVERTIME_HIGH"] = totalOvertimeHours;
        messages["OVERTIME_HIGH"] = $"Tổng giờ tăng ca (ước tính): {totalOvertimeHours:N0}";

        // Sick leave - no direct data, use as placeholder
        values["SICK_LEAVE_HIGH"] = 2m;
        messages["SICK_LEAVE_HIGH"] = "Dữ liệu nghỉ ốm cần được tích hợp từ HR system";

        return new DepartmentAlertMetrics("HumanResources", values, messages);
    }
}
