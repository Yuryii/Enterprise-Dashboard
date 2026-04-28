using CAAdventureWorks.Application.DebtOptimization;
using CAAdventureWorks.Application.DebtOptimization.Dto;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.DebtOptimization.Commands.OptimizePayment;

public record OptimizePaymentCommand(decimal Budget) : IRequest<OptimizationResponseDto>;

public class OptimizePaymentCommandHandler(
    IChatBotDbContext db,
    KnapsackSolver knapsackSolver,
    IDebtCfoKernelService cfoService)
    : IRequestHandler<OptimizePaymentCommand, OptimizationResponseDto>
{
    public async Task<OptimizationResponseDto> Handle(OptimizePaymentCommand request, CancellationToken ct)
    {
        // 1. Lấy danh sách công nợ đang chờ
        var pendingDebts = await db.VendorDebts
            .AsNoTracking()
            .Where(d => d.Status == DebtStatus.Pending)
            .ToListAsync(ct);

        // 2. Chuyển sang DebtItem cho thuật toán
        var debtItems = pendingDebts.Select(d => new DebtItem(
            d.VendorDebtId,
            d.Amount,
            d.ImportanceScore,
            d.VendorName,
            d.VendorEmail,
            d.InvoiceNumber,
            d.Category,
            d.DueDate
        )).ToList();

        // 3. Chạy thuật toán Knapsack
        var result = knapsackSolver.Solve(debtItems, request.Budget);

        // 4. Cập nhật trạng thái trong DB
        var selectedIds = new HashSet<int>(result.SelectedItems.Select(i => i.Id));
        var deferredIds = new HashSet<int>(result.DeferredItems.Select(i => i.Id));

        var toPay = await db.VendorDebts
            .Where(d => selectedIds.Contains(d.VendorDebtId))
            .ToListAsync(ct);

        var toDefer = await db.VendorDebts
            .Where(d => deferredIds.Contains(d.VendorDebtId))
            .ToListAsync(ct);

        foreach (var debt in toPay)
        {
            debt.Status = DebtStatus.Paid;
            debt.PaidAt = DateTime.UtcNow;
        }

        foreach (var debt in toDefer)
        {
            debt.Status = DebtStatus.Deferred;
        }

        // 5. Lưu kế hoạch thanh toán
        var paymentPlan = new PaymentPlan
        {
            PlannedDate = DateTime.UtcNow,
            TotalBudget = request.Budget,
            UsedBudget = result.TotalPaidAmount,
            RemainingBudget = result.RemainingBudget,
            TotalDebtsCount = debtItems.Count,
            SelectedDebtsCount = result.SelectedItems.Count,
            DeferredDebtsCount = result.DeferredItems.Count,
            TotalImportanceScore = result.TotalImportanceScore,
            CreatedAt = DateTime.UtcNow
        };

        db.PaymentPlans.Add(paymentPlan);
        await db.SaveChangesAsync(ct);

        // 6. Chuyển sang DTO
        var paidDtos = result.SelectedItems.Select(i => new DebtItemDto(
            i.Id, i.VendorName, i.VendorEmail, i.InvoiceNumber,
            i.Amount, i.ImportanceScore, i.Category, i.DueDate, "Paid"
        )).ToList();

        var deferredDtos = result.DeferredItems.Select(i => new DebtItemDto(
            i.Id, i.VendorName, i.VendorEmail, i.InvoiceNumber,
            i.Amount, i.ImportanceScore, i.Category, i.DueDate, "Deferred"
        )).ToList();

        // 7. Gọi AI viết email cho các vendor bị deferred
        DebtEmailDto? emailDraft = null;
        if (result.DeferredItems.Count > 0)
        {
            try
            {
                emailDraft = await cfoService.ComposeDeferralEmailAsync(deferredDtos, ct);
            }
            catch (Exception)
            {
                // AI failed, continue without email draft
            }
        }

        return new OptimizationResponseDto(
            request.Budget,
            result.TotalPaidAmount,
            result.RemainingBudget,
            result.TotalImportanceScore,
            result.SelectedItems.Count,
            result.DeferredItems.Count,
            paidDtos,
            deferredDtos,
            emailDraft,
            DateTime.UtcNow
        );
    }
}
