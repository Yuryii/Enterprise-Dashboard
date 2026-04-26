using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.GetAlertHistory;

public record GetAlertHistoryQuery(
    string? UserId = null,
    int Page = 1,
    int PageSize = 20) : IRequest<AlertHistoryListDto>;

public class GetAlertHistoryQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetAlertHistoryQuery, AlertHistoryListDto>
{
    public async Task<AlertHistoryListDto> Handle(GetAlertHistoryQuery request, CancellationToken ct)
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

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(h => h.TriggeredAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        return new AlertHistoryListDto(
            items.Select(h => new AlertHistoryDto(
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
            )).ToList(),
            totalCount,
            request.Page,
            request.PageSize
        );
    }
}
