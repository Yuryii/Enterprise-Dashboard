using CAAdventureWorks.Application.DebtOptimization.Dto;
using MediatR;

namespace CAAdventureWorks.Application.DebtOptimization.Commands.SendDebtEmail;

public record SendDebtEmailCommand(
    List<string> Recipients,
    List<string>? Cc,
    string Subject,
    string Body
) : IRequest<EmailSendResultDto>;

public class SendDebtEmailCommandHandler(IEmailSender emailSender)
    : IRequestHandler<SendDebtEmailCommand, EmailSendResultDto>
{
    public async Task<EmailSendResultDto> Handle(SendDebtEmailCommand request, CancellationToken ct)
    {
        var emailRequest = new EmailRequest(request.Recipients, request.Cc, request.Subject, request.Body);
        var result = await emailSender.SendAsync(emailRequest, ct);

        return new EmailSendResultDto(result.Success, result.ErrorMessage);
    }
}
