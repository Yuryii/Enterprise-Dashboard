using CAAdventureWorks.Domain.Entities.ChatBot;

namespace CAAdventureWorks.Application.Alerts.Interfaces;

public interface IAlertEmailNotificationService
{
    Task SendAlertEmailAsync(AlertHistory history, AlertConfiguration config, CancellationToken ct = default);
}
