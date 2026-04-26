using CAAdventureWorks.Domain.Entities.ChatBot;

namespace CAAdventureWorks.Application.Alerts.Interfaces;

public interface IAlertEvaluationService
{
    Task<AlertEvaluationResult> EvaluateAsync(AlertConfiguration config, CancellationToken ct = default);
}

public record AlertEvaluationResult(bool IsTriggered, decimal ActualValue, string Message);
