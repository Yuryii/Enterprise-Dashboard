using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.GetUnreadCount;

public record GetUnreadCountQuery(string? UserId = null) : IRequest<int>;

public class GetUnreadCountQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetUnreadCountQuery, int>
{
    public async Task<int> Handle(GetUnreadCountQuery request, CancellationToken ct)
    {
        var query = db.AlertHistories
            .AsNoTracking()
            .Include(h => h.AlertConfiguration)
            .Where(h => !h.IsRead && !h.IsDismissed);

        if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            query = query.Where(h => h.AlertConfiguration.UserId == request.UserId);
        }

        return await query.CountAsync(ct);
    }
}
