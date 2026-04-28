using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.BackgroundJobs;

public class AlertEvaluationJob
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AlertEvaluationJob> _logger;

    public AlertEvaluationJob(IServiceProvider serviceProvider, ILogger<AlertEvaluationJob> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task ExecuteAsync(int configurationId, CancellationToken ct = default)
    {
        _logger.LogInformation("[AlertJob] Starting execution for ConfigId={ConfigId}", configurationId);

        await using var scope = _serviceProvider.CreateAsyncScope();
        var alertDb = scope.ServiceProvider.GetRequiredService<IChatBotDbContext>();
        var mainDb = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var evalService = scope.ServiceProvider.GetRequiredService<IAlertEvaluationService>();

        var config = await alertDb.AlertConfigurations
            .Include(c => c.AlertDefinition)
            .FirstOrDefaultAsync(c => c.Id == configurationId, ct);

        if (config == null)
        {
            _logger.LogWarning("[AlertJob] Config not found: ConfigId={ConfigId}", configurationId);
            return;
        }

        if (!config.IsEnabled)
        {
            _logger.LogInformation("[AlertJob] Config is disabled, skipping: ConfigId={ConfigId}", configurationId);
            return;
        }

        _logger.LogInformation("[AlertJob] Config found: ConfigId={ConfigId}, AlertName={AlertName}, IsEnabled={IsEnabled}",
            configurationId, config.AlertDefinition?.Name, config.IsEnabled);

        AlertEvaluationResult result;
        try
        {
            result = await evalService.EvaluateAsync(config, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AlertJob] Evaluation threw exception for ConfigId={ConfigId}", configurationId);
            return;
        }

        _logger.LogInformation("[AlertJob] Evaluation result: ConfigId={ConfigId}, IsTriggered={IsTriggered}, ActualValue={ActualValue}",
            configurationId, result.IsTriggered, result.ActualValue);

        var history = new AlertHistory
        {
            AlertConfigurationId = config.Id,
            AlertDefinitionId = config.AlertDefinitionId,
            TriggeredAt = DateTime.UtcNow,
            ThresholdValue = config.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold ?? 0m,
            ActualValue = result.ActualValue,
            Message = result.Message,
            IsRead = false,
            IsDismissed = false
        };

        alertDb.AlertHistories.Add(history);
        config.LastTriggeredAt = DateTime.UtcNow;

        try
        {
            await alertDb.SaveChangesAsync(ct);
            _logger.LogInformation("[AlertJob] History saved: ConfigId={ConfigId}, HistoryId={HistoryId}, IsTriggered={IsTriggered}",
                configurationId, history.Id, result.IsTriggered);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AlertJob] SaveChanges failed for ConfigId={ConfigId}", configurationId);
        }

        // Send email notification if alert is triggered
        _logger.LogWarning("[EmailDebug] Checking email trigger: IsTriggered={IsTriggered}", result.IsTriggered);
        if (result.IsTriggered)
        {
            var emailService = scope.ServiceProvider.GetRequiredService<IAlertEmailNotificationService>();
            try
            {
                await emailService.SendAlertEmailAsync(history, config, ct);
                _logger.LogInformation("[AlertJob] Email notification sent for ConfigId={ConfigId}", configurationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AlertJob] Email notification failed for ConfigId={ConfigId}", configurationId);
            }
        }
    }
}
