namespace CAAdventureWorks.Application.DebtOptimization;

public interface IEmailSender
{
    Task<EmailSendResult> SendAsync(EmailRequest request, CancellationToken cancellationToken = default);
}

public record EmailRequest(List<string> To, List<string>? Cc, string Subject, string Body);

public record EmailSendResult(bool Success, string? ErrorMessage, DateTime SentAt);
