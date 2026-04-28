namespace CAAdventureWorks.Application.DebtOptimization.Dto;

public sealed record DebtItemDto(
    int Id,
    string VendorName,
    string VendorEmail,
    string InvoiceNumber,
    decimal Amount,
    int ImportanceScore,
    string Category,
    DateTime DueDate,
    string Status
);

public sealed record PendingDebtsResponseDto(
    int TotalCount,
    decimal TotalAmount,
    List<DebtItemDto> Debts
);

public sealed record OptimizationResponseDto(
    decimal TotalBudget,
    decimal UsedBudget,
    decimal RemainingBudget,
    int TotalImportanceScore,
    int PaidDebtsCount,
    int DeferredDebtsCount,
    List<DebtItemDto> PaidDebts,
    List<DebtItemDto> DeferredDebts,
    DebtEmailDto? AiEmailDraft,
    DateTime OptimizedAt
);

public sealed record DebtEmailDto(
    string Subject,
    List<string> Recipients,
    List<string> Cc,
    string Body,
    string GeneratedBy
);

public sealed record EmailSendRequestDto(
    List<string> Recipients,
    List<string>? Cc,
    string Subject,
    string Body
);

public sealed record EmailSendResultDto(
    bool Success,
    string? Message
);

public sealed record VendorScoreDto(
    int Id,
    string VendorCategory,
    int Score,
    string Reason
);
