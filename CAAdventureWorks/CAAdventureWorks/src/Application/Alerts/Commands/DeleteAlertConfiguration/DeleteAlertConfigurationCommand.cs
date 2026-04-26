using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Alerts.Commands.DeleteAlertConfiguration;

public record DeleteAlertConfigurationCommand(int Id) : IRequest<bool>;

public class DeleteAlertConfigurationCommandHandler(
    IChatBotDbContext db,
    IUser user,
    IAlertScheduler scheduler)
    : IRequestHandler<DeleteAlertConfigurationCommand, bool>
{
    public async Task<bool> Handle(DeleteAlertConfigurationCommand request, CancellationToken ct)
    {
        var userId = user.Id ?? throw new UnauthorizedAccessException("User not authenticated.");

        var config = await db.AlertConfigurations
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.UserId == userId, ct)
            ?? throw new InvalidOperationException("Alert configuration not found or access denied.");

        scheduler.RemoveAlertJob(config.Id);

        db.AlertConfigurations.Remove(config);
        await db.SaveChangesAsync(ct);

        return true;
    }
}
