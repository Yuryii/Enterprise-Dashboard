using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.DebtOptimization;
using CAAdventureWorks.Application.DebtOptimization.Dto;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.DebtOptimization.Commands.SendDebtEmail;

public record SendDebtEmailCommand(
    List<string> Recipients,
    List<string>? Cc,
    string Subject,
    string Body,
    List<int>? DeferredVendorIds
) : IRequest<EmailSendResultDto>;

public class SendDebtEmailCommandHandler(
    IEmailSender emailSender,
    IChatBotDbContext db)
    : IRequestHandler<SendDebtEmailCommand, EmailSendResultDto>
{
    public async Task<EmailSendResultDto> Handle(SendDebtEmailCommand request, CancellationToken ct)
    {
        List<string> finalRecipients;

        if (request.DeferredVendorIds?.Count > 0)
        {
            var vendorEmails = await db.VendorDebts
                .AsNoTracking()
                .Where(v => request.DeferredVendorIds.Contains(v.VendorDebtId))
                .Select(v => v.VendorEmail)
                .Distinct()
                .ToListAsync(ct);

            finalRecipients = vendorEmails.Count > 0 ? vendorEmails : request.Recipients;
        }
        else
        {
            finalRecipients = request.Recipients;
        }

        var emailRequest = new EmailRequest(finalRecipients, request.Cc, request.Subject, request.Body);
        var result = await emailSender.SendAsync(emailRequest, ct);

        return new EmailSendResultDto(result.Success, result.ErrorMessage);
    }
}
