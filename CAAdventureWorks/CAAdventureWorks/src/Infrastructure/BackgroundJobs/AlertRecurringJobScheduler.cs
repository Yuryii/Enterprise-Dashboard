using CAAdventureWorks.Application.Alerts.Interfaces;
using Hangfire;

namespace CAAdventureWorks.Infrastructure.BackgroundJobs;

public class AlertRecurringJobScheduler : IAlertScheduler
{
    public void RegisterAlertJob(int configurationId, int scanIntervalDays, int? scanIntervalSeconds = null)
    {
        var jobId = GetJobId(configurationId);

        string cronExpression;
        if (scanIntervalSeconds.HasValue && scanIntervalSeconds.Value > 0)
        {
            // NCrontab 6-field cron: every N seconds starting at second 0
            cronExpression = $"0/{scanIntervalSeconds.Value} * * * * *";
        }
        else
        {
            cronExpression = scanIntervalDays switch
            {
                1 => "0 0 * * *",
                3 => "0 0 */3 * *",
                7 => "0 0 */7 * *",
                14 => "0 0 */14 * *",
                30 => "0 0 1 * *",
                _ => "0 0 */1 * *"
            };
        }

        RecurringJob.AddOrUpdate<AlertEvaluationJob>(
            jobId,
            job => job.ExecuteAsync(configurationId, default),
            cronExpression
        );
    }

    public void RemoveAlertJob(int configurationId)
    {
        var jobId = GetJobId(configurationId);
        RecurringJob.RemoveIfExists(jobId);
    }

    public void UpdateAlertJob(int configurationId, int scanIntervalDays, int? scanIntervalSeconds = null)
    {
        RegisterAlertJob(configurationId, scanIntervalDays, scanIntervalSeconds);
    }

    private static string GetJobId(int configurationId) => $"alert-config-{configurationId}";
}
