namespace CAAdventureWorks.Application.FinanceDashboard.Queries.GetFinanceDashboard;

public sealed class FinanceDashboardResponseDto
{
    public FinanceDashboardAppliedFilterDto Filters { get; init; } = new();

    public FinanceOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<FinanceTrendPointDto> RevenueTrend { get; init; } = [];

    public IReadOnlyList<FinanceTrendPointDto> ExpenseTrend { get; init; } = [];

    public IReadOnlyList<FinanceTrendPointDto> ProfitTrend { get; init; } = [];

    public IReadOnlyList<FinanceTaxItemDto> TaxByRegion { get; init; } = [];

    public IReadOnlyList<FinanceCurrencyItemDto> RevenueByCurrency { get; init; } = [];

    public IReadOnlyList<FinancePaymentMethodItemDto> PaymentMethods { get; init; } = [];

    public IReadOnlyList<FinanceCashFlowItemDto> CashFlow { get; init; } = [];

    public FinanceDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class FinanceDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public string? CurrencyCode { get; init; }

    public int? TerritoryId { get; init; }
}

public sealed class FinanceOverviewDto
{
    public decimal TotalRevenue { get; init; }

    public decimal TotalExpense { get; init; }

    public decimal GrossProfit { get; init; }

    public decimal ProfitMargin { get; init; }

    public decimal TotalTax { get; init; }

    public decimal AverageTaxRate { get; init; }

    public decimal CashFlow { get; init; }

    public int TotalOrders { get; init; }
}

public sealed class FinanceTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public decimal Amount { get; init; }

    public int Count { get; init; }
}

public sealed class FinanceTaxItemDto
{
    public int StateProvinceId { get; init; }

    public string StateProvinceName { get; init; } = string.Empty;

    public decimal TotalTax { get; init; }

    public decimal AverageTaxRate { get; init; }

    public int OrderCount { get; init; }
}

public sealed class FinanceCurrencyItemDto
{
    public string CurrencyCode { get; init; } = string.Empty;

    public string CurrencyName { get; init; } = string.Empty;

    public decimal TotalRevenue { get; init; }

    public int OrderCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class FinancePaymentMethodItemDto
{
    public string PaymentMethod { get; init; } = string.Empty;

    public decimal TotalAmount { get; init; }

    public int OrderCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class FinanceCashFlowItemDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public decimal CashIn { get; init; }

    public decimal CashOut { get; init; }

    public decimal NetCashFlow { get; init; }
}

public sealed class FinanceDashboardFilterOptionsDto
{
    public IReadOnlyList<FinanceFilterLookupItemDto> Currencies { get; init; } = [];

    public IReadOnlyList<FinanceFilterLookupItemDto> Territories { get; init; } = [];
}

public sealed record FinanceFilterLookupItemDto(int Id, string Name);
