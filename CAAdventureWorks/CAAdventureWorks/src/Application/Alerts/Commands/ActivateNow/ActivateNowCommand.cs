using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Application.Alerts.Commands.ActivateNow;

public record ActivateNowCommand(int ConfigurationId) : IRequest<AlertHistoryDto>;

public class ActivateNowCommandHandler(
    IChatBotDbContext db,
    IAlertEvaluationService evalService,
    ILogger<ActivateNowCommandHandler> logger)
    : IRequestHandler<ActivateNowCommand, AlertHistoryDto>
{
    public async Task<AlertHistoryDto> Handle(ActivateNowCommand request, CancellationToken ct)
    {
        logger.LogInformation("[ActivateNow] Received request for ConfigId={ConfigId}", request.ConfigurationId);

        var config = await db.AlertConfigurations
            .Include(c => c.AlertDefinition)
            .FirstOrDefaultAsync(c => c.Id == request.ConfigurationId, ct);

        if (config == null)
        {
            logger.LogError("[ActivateNow] Config not found: {ConfigId}", request.ConfigurationId);
            throw new InvalidOperationException("Alert configuration not found.");
        }

        if (config.AlertDefinition == null)
        {
            logger.LogError("[ActivateNow] AlertDefinition is null for ConfigId={ConfigId}", request.ConfigurationId);
            throw new InvalidOperationException("Alert definition not found.");
        }

        logger.LogInformation("[ActivateNow] ConfigId={ConfigId}, AlertName={AlertName}, Threshold={Threshold}",
            request.ConfigurationId, config.AlertDefinition.Name, config.ThresholdValue);

        AlertEvaluationResult result;
        try
        {
            result = await evalService.EvaluateAsync(config, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ActivateNow] Evaluation failed for ConfigId={ConfigId}", request.ConfigurationId);
            throw;
        }

        logger.LogInformation("[ActivateNow] Evaluation result: IsTriggered={IsTriggered}, ActualValue={ActualValue}, Message={Message}",
            result.IsTriggered, result.ActualValue, result.Message);

        var history = new Domain.Entities.ChatBot.AlertHistory
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

        db.AlertHistories.Add(history);
        config.LastTriggeredAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[ActivateNow] SaveChanges failed for ConfigId={ConfigId}", request.ConfigurationId);
            throw;
        }

        logger.LogInformation("[ActivateNow] History saved with Id={HistoryId}", history.Id);

        return ToDto(history, config.AlertDefinition!);
    }

    private static AlertHistoryDto ToDto(
        Domain.Entities.ChatBot.AlertHistory history,
        Domain.Entities.ChatBot.AlertDefinition definition) =>
        new(
            history.Id,
            history.AlertConfigurationId,
            history.AlertDefinitionId,
            definition.Name,
            definition.Code,
            history.TriggeredAt,
            history.ThresholdValue,
            history.ActualValue,
            history.Message,
            history.IsRead,
            history.IsDismissed
        );
}
