using CAAdventureWorks.Application.Alerts.Interfaces;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public interface IAlertComputeService
{
    string DepartmentCode { get; }
    Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default);
}

public record DepartmentAlertMetrics(
    string DepartmentCode,
    Dictionary<string, decimal> MetricValues,
    Dictionary<string, string> MetricMessages
);
