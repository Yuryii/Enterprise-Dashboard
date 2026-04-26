using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Commands.CreateAlertConfiguration;

public record CreateAlertConfigurationCommand(
    int AlertDefinitionId,
    decimal? ThresholdValue,
    int ScanIntervalDays,
    int? ScanIntervalSeconds,
    string? ExtraParameters) : IRequest<AlertConfigurationDto>;

public class CreateAlertConfigurationCommandHandler(
    IChatBotDbContext db,
    IUser user,
    IAlertScheduler scheduler)
    : IRequestHandler<CreateAlertConfigurationCommand, AlertConfigurationDto>
{
    public async Task<AlertConfigurationDto> Handle(CreateAlertConfigurationCommand request, CancellationToken ct)
    {
        var userId = user.Id ?? throw new UnauthorizedAccessException("User not authenticated.");

        var definition = await db.AlertDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == request.AlertDefinitionId && d.IsActive, ct)
            ?? throw new InvalidOperationException("Alert definition not found or inactive.");

        var existingConfig = await db.AlertConfigurations
            .FirstOrDefaultAsync(c => c.UserId == userId && c.AlertDefinitionId == request.AlertDefinitionId, ct);

        if (existingConfig != null)
        {
            existingConfig.IsEnabled = true;
            existingConfig.ThresholdValue = request.ThresholdValue ?? definition.DefaultThreshold;
            existingConfig.ScanIntervalDays = request.ScanIntervalDays;
            existingConfig.ScanIntervalSeconds = request.ScanIntervalSeconds;
            existingConfig.ExtraParameters = request.ExtraParameters;
            existingConfig.UpdatedAt = DateTime.UtcNow;

            db.AlertConfigurations.Update(existingConfig);
            await db.SaveChangesAsync(ct);

            scheduler.UpdateAlertJob(existingConfig.Id, existingConfig.ScanIntervalDays, existingConfig.ScanIntervalSeconds);

            return ToDto(existingConfig, definition);
        }

        var config = new Domain.Entities.ChatBot.AlertConfiguration
        {
            AlertDefinitionId = request.AlertDefinitionId,
            UserId = userId,
            DepartmentCode = definition.DepartmentCode,
            IsEnabled = true,
            ThresholdValue = request.ThresholdValue ?? definition.DefaultThreshold,
            ScanIntervalDays = request.ScanIntervalDays,
            ScanIntervalSeconds = request.ScanIntervalSeconds,
            ExtraParameters = request.ExtraParameters,
            CreatedAt = DateTime.UtcNow
        };

        db.AlertConfigurations.Add(config);
        await db.SaveChangesAsync(ct);

        scheduler.RegisterAlertJob(config.Id, config.ScanIntervalDays, config.ScanIntervalSeconds);

        return ToDto(config, definition);
    }

    private static AlertConfigurationDto ToDto(
        Domain.Entities.ChatBot.AlertConfiguration config,
        Domain.Entities.ChatBot.AlertDefinition definition) =>
        new(
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
                definition.Id,
                definition.Code,
                definition.Name,
                definition.Description,
                definition.DepartmentCode,
                definition.DefaultThreshold,
                definition.ThresholdUnit,
                definition.RequiresParameters
            )
        );
}
