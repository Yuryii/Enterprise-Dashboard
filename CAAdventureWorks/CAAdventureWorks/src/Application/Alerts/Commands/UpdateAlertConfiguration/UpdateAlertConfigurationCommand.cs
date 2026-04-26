using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Commands.UpdateAlertConfiguration;

public record UpdateAlertConfigurationCommand(
    int Id,
    bool IsEnabled,
    decimal? ThresholdValue,
    int ScanIntervalDays,
    int? ScanIntervalSeconds,
    string? ExtraParameters) : IRequest<AlertConfigurationDto>;

public class UpdateAlertConfigurationCommandHandler(
    IChatBotDbContext db,
    IUser user,
    IAlertScheduler scheduler)
    : IRequestHandler<UpdateAlertConfigurationCommand, AlertConfigurationDto>
{
    public async Task<AlertConfigurationDto> Handle(UpdateAlertConfigurationCommand request, CancellationToken ct)
    {
        var userId = user.Id ?? throw new UnauthorizedAccessException("User not authenticated.");

        var config = await db.AlertConfigurations
            .Include(c => c.AlertDefinition)
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.UserId == userId, ct)
            ?? throw new InvalidOperationException("Alert configuration not found or access denied.");

        config.IsEnabled = request.IsEnabled;
        config.ThresholdValue = request.ThresholdValue ?? config.AlertDefinition?.DefaultThreshold;
        config.ScanIntervalDays = request.ScanIntervalDays;
        config.ScanIntervalSeconds = request.ScanIntervalSeconds;
        config.ExtraParameters = request.ExtraParameters;
        config.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        scheduler.UpdateAlertJob(config.Id, config.ScanIntervalDays, config.ScanIntervalSeconds);

        var def = config.AlertDefinition!;
        return new AlertConfigurationDto(
            config.Id,
            config.AlertDefinitionId,
            config.UserId,
            config.DepartmentCode,
            config.IsEnabled,
            config.ThresholdValue,
            config.ScanIntervalDays,
            config.ScanIntervalSeconds,
            config.ExtraParameters,
            config.LastTriggeredAt,
            config.CreatedAt,
            new AlertDefinitionDto(
                def.Id, def.Code, def.Name, def.Description, def.DepartmentCode,
                def.DefaultThreshold, def.ThresholdUnit, def.RequiresParameters
            )
        );
    }
}
