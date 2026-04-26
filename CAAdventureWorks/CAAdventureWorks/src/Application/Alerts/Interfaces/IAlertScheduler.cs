namespace CAAdventureWorks.Application.Alerts.Interfaces;

public interface IAlertScheduler
{
    void RegisterAlertJob(int configurationId, int scanIntervalDays, int? scanIntervalSeconds = null);
    void UpdateAlertJob(int configurationId, int scanIntervalDays, int? scanIntervalSeconds = null);
    void RemoveAlertJob(int configurationId);
}
