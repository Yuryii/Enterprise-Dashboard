using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.GetUnreadAlerts;

public record GetUnreadAlertsQuery(string? UserId = null, int MaxCount = 10) : IRequest<IReadOnlyList<AlertHistoryDto>>;

public class GetUnreadAlertsQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetUnreadAlertsQuery, IReadOnlyList<AlertHistoryDto>>
{
    public async Task<IReadOnlyList<AlertHistoryDto>> Handle(GetUnreadAlertsQuery request, CancellationToken ct)
    {
        var query = db.AlertHistories
            .AsNoTracking()
            .Include(h => h.AlertDefinition)
            .Include(h => h.AlertConfiguration)
            .Where(h => !h.IsDismissed)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            query = query.Where(h => h.AlertConfiguration.UserId == request.UserId);
        }

        var items = await query
            .OrderByDescending(h => h.TriggeredAt)
            .Take(request.MaxCount)
            .ToListAsync(ct);

        return items.Select(h => new AlertHistoryDto(
            h.Id,
            h.AlertConfigurationId,
            h.AlertDefinitionId,
            h.AlertDefinition?.Name ?? "Unknown",
            h.AlertDefinition?.Code ?? "Unknown",
            h.TriggeredAt,
            h.ThresholdValue,
            h.ActualValue,
            h.Message,
            h.IsRead,
            h.IsDismissed
        )).ToList();
    }
}
