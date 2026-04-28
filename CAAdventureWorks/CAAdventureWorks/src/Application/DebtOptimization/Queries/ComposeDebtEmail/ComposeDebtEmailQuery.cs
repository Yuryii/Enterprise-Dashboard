using CAAdventureWorks.Application.DebtOptimization.Dto;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.DebtOptimization.Queries.ComposeDebtEmail;

public record ComposeDebtEmailQuery(List<int> DeferredVendorIds) : IRequest<DebtEmailDto>;

public class ComposeDebtEmailQueryHandler(
    IChatBotDbContext db,
    IDebtCfoKernelService cfoService)
    : IRequestHandler<ComposeDebtEmailQuery, DebtEmailDto>
{
    public async Task<DebtEmailDto> Handle(ComposeDebtEmailQuery request, CancellationToken ct)
    {
        var debts = await db.VendorDebts
            .AsNoTracking()
            .Where(d => request.DeferredVendorIds.Contains(d.VendorDebtId))
            .ToListAsync(ct);

        var dtos = debts.Select(d => new DebtItemDto(
            d.VendorDebtId,
            d.VendorName,
            d.VendorEmail,
            d.InvoiceNumber,
            d.Amount,
            d.ImportanceScore,
            d.Category,
            d.DueDate,
            d.Status.ToString()
        )).ToList();

        return await cfoService.ComposeDeferralEmailAsync(dtos, ct);
    }
}
