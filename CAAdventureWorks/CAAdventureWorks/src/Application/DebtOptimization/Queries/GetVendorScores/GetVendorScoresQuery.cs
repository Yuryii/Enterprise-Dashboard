using CAAdventureWorks.Application.DebtOptimization.Dto;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.DebtOptimization.Queries.GetVendorScores;

public record GetVendorScoresQuery : IRequest<List<VendorScoreDto>>;

public class GetVendorScoresQueryHandler(IChatBotDbContext db)
    : IRequestHandler<GetVendorScoresQuery, List<VendorScoreDto>>
{
    public async Task<List<VendorScoreDto>> Handle(GetVendorScoresQuery request, CancellationToken ct)
    {
        return await db.VendorImportances
            .AsNoTracking()
            .OrderByDescending(v => v.Score)
            .Select(v => new VendorScoreDto(
                v.VendorImportanceId,
                v.VendorCategory,
                v.Score,
                v.Reason
            ))
            .ToListAsync(ct);
    }
}
