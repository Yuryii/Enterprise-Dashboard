using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Queries.DismissAlert;

public record DismissAlertQuery(int HistoryId, bool? IsRead = null) : IRequest<bool>;

public class DismissAlertQueryHandler(IChatBotDbContext db, IUser user)
    : IRequestHandler<DismissAlertQuery, bool>
{
    public async Task<bool> Handle(DismissAlertQuery request, CancellationToken ct)
    {
        var userId = user.Id ?? throw new UnauthorizedAccessException("User not authenticated.");

        var history = await db.AlertHistories
            .Include(h => h.AlertConfiguration)
            .FirstOrDefaultAsync(h => h.Id == request.HistoryId && h.AlertConfiguration.UserId == userId, ct)
            ?? throw new InvalidOperationException("Alert history not found or access denied.");

        if (request.IsRead.HasValue)
        {
            history.IsRead = request.IsRead.Value;
        }
        else
        {
            history.IsDismissed = true;
        }

        await db.SaveChangesAsync(ct);
        return true;
    }
}
