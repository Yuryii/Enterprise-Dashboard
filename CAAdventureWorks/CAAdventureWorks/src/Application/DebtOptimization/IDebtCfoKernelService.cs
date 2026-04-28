using CAAdventureWorks.Application.DebtOptimization.Dto;

namespace CAAdventureWorks.Application.DebtOptimization;

public interface IDebtCfoKernelService
{
    Task<DebtEmailDto> ComposeDeferralEmailAsync(
        List<DebtItemDto> deferredDebts,
        CancellationToken cancellationToken = default);
}
