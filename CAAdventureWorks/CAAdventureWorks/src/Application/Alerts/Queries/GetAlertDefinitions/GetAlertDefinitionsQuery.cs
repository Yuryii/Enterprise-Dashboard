using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.GetAlertDefinitions;

public record GetAlertDefinitionsQuery(string? DepartmentCode = null) : IRequest<IReadOnlyList<AlertDefinitionDto>>;

public class GetAlertDefinitionsQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetAlertDefinitionsQuery, IReadOnlyList<AlertDefinitionDto>>
{
    public async Task<IReadOnlyList<AlertDefinitionDto>> Handle(GetAlertDefinitionsQuery request, CancellationToken ct)
    {
        var query = db.AlertDefinitions
            .AsNoTracking()
            .Where(d => d.IsActive);

        if (!string.IsNullOrWhiteSpace(request.DepartmentCode))
        {
            query = query.Where(d => d.DepartmentCode == request.DepartmentCode);
        }

        var definitions = await query
            .OrderBy(d => d.Name)
            .ToListAsync(ct);

        return definitions.Select(d => new AlertDefinitionDto(
            d.Id, d.Code, d.Name, d.Description,
            d.DepartmentCode, d.DefaultThreshold, d.ThresholdUnit, d.RequiresParameters
        )).ToList();
    }
}
