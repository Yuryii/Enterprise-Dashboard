using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.GetAlertConfigurations;

public record GetAlertConfigurationsQuery(string? UserId = null) : IRequest<IReadOnlyList<AlertConfigurationDto>>;

public class GetAlertConfigurationsQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetAlertConfigurationsQuery, IReadOnlyList<AlertConfigurationDto>>
{
    public async Task<IReadOnlyList<AlertConfigurationDto>> Handle(GetAlertConfigurationsQuery request, CancellationToken ct)
    {
        var query = db.AlertConfigurations
            .AsNoTracking()
            .Include(c => c.AlertDefinition)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            query = query.Where(c => c.UserId == request.UserId);
        }

        var configs = await query.OrderBy(c => c.AlertDefinition!.Name).ToListAsync(ct);

        return configs.Select(c => new AlertConfigurationDto(
            c.Id,
            c.AlertDefinitionId,
            c.UserId,
            c.DepartmentCode,
            c.IsEnabled,
            c.ThresholdValue,
            c.ScanIntervalDays,
            c.ScanIntervalSeconds,
            c.ExtraParameters,
            c.LastTriggeredAt,
            c.CreatedAt,
            c.AlertDefinition != null
                ? new AlertDefinitionDto(
                    c.AlertDefinition.Id, c.AlertDefinition.Code, c.AlertDefinition.Name,
                    c.AlertDefinition.Description, c.AlertDefinition.DepartmentCode,
                    c.AlertDefinition.DefaultThreshold, c.AlertDefinition.ThresholdUnit,
                    c.AlertDefinition.RequiresParameters)
                : null
        )).ToList();
    }
}
