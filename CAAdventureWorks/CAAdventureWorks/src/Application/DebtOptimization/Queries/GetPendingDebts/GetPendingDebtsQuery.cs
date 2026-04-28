using CAAdventureWorks.Application.DebtOptimization.Dto;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.DebtOptimization.Queries.GetPendingDebts;

public record GetPendingDebtsQuery : IRequest<PendingDebtsResponseDto>;

public class GetPendingDebtsQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetPendingDebtsQuery, PendingDebtsResponseDto>
{
    public async Task<PendingDebtsResponseDto> Handle(GetPendingDebtsQuery request, CancellationToken ct)
    {
        var debts = await db.VendorDebts
            .AsNoTracking()
            .OrderByDescending(d => d.ImportanceScore)
            .ThenBy(d => d.DueDate)
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

        return new PendingDebtsResponseDto(
            dtos.Count,
            dtos.Sum(d => d.Amount),
            dtos
        );
    }
}
