namespace CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionDashboard;

public sealed class ProductionDashboardResponseDto
{
    public ProductionDashboardAppliedFilterDto Filters { get; init; } = new();

    public ProductionOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<ProductionTrendPointDto> WorkOrderTrend { get; init; } = [];

    public IReadOnlyList<ProductionOutputTrendPointDto> OutputTrend { get; init; } = [];

    public IReadOnlyList<ProductionProductItemDto> TopProducts { get; init; } = [];

    public IReadOnlyList<ProductionProductItemDto> TopScrapProducts { get; init; } = [];

    public IReadOnlyList<ProductionCategoryItemDto> Categories { get; init; } = [];

    public IReadOnlyList<ProductionLocationCostItemDto> LocationCosts { get; init; } = [];

    public IReadOnlyList<ProductionOperationVarianceItemDto> OperationVariances { get; init; } = [];

    public IReadOnlyList<ProductionLocationHoursItemDto> LocationHours { get; init; } = [];

    public IReadOnlyList<ProductionDelayedItemDto> DelayedWorkOrders { get; init; } = [];

    public IReadOnlyList<ProductionInventoryItemDto> InventoryByLocation { get; init; } = [];

    public IReadOnlyList<ProductionSafetyStockItemDto> SafetyStockAlerts { get; init; } = [];

    public IReadOnlyList<ProductionCostHistoryItemDto> CostHistory { get; init; } = [];

    public IReadOnlyList<ProductionBomItemDto> BomSummaries { get; init; } = [];

    public IReadOnlyList<ProductionTransactionTrendPointDto> TransactionTrend { get; init; } = [];

    public ProductionDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class ProductionDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public int? ProductId { get; init; }

    public int? ProductCategoryId { get; init; }

    public short? LocationId { get; init; }

    public short? ScrapReasonId { get; init; }

    public bool? MakeOnly { get; init; }

    public bool? FinishedGoodsOnly { get; init; }

    public bool? OpenOnly { get; init; }

    public bool? DelayedOnly { get; init; }

    public bool? SafetyStockOnly { get; init; }
}

public sealed class ProductionOverviewDto
{
    public int TotalWorkOrders { get; init; }

    public int TotalOrderQty { get; init; }

    public int TotalStockedQty { get; init; }

    public int TotalScrappedQty { get; init; }

    public decimal CompletionRate { get; init; }

    public decimal ScrapRate { get; init; }

    public int OpenWorkOrders { get; init; }

    public int DelayedWorkOrders { get; init; }

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal CostVariance { get; init; }

    public decimal ActualResourceHours { get; init; }

    public int TotalInventoryQty { get; init; }

    public int SafetyStockAlerts { get; init; }

    public decimal ProductionTransactionCost { get; init; }
}

public sealed class ProductionTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int WorkOrders { get; init; }

    public int OpenWorkOrders { get; init; }

    public int DelayedWorkOrders { get; init; }
}

public sealed class ProductionOutputTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public decimal CompletionRate { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class ProductionProductItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string ProductCategoryName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public decimal CompletionRate { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class ProductionCategoryItemDto
{
    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public decimal CompletionRate { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class ProductionLocationCostItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal CostVariance { get; init; }

    public int WorkOrders { get; init; }
}

public sealed class ProductionOperationVarianceItemDto
{
    public short OperationSequence { get; init; }

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal CostVariance { get; init; }

    public decimal ActualResourceHours { get; init; }
}

public sealed class ProductionLocationHoursItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal ActualResourceHours { get; init; }

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }
}

public sealed class ProductionDelayedItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public short? LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }
}

public sealed class ProductionInventoryItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public int InventoryQty { get; init; }

    public int DistinctProducts { get; init; }
}

public sealed class ProductionSafetyStockItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int InventoryQty { get; init; }

    public int SafetyStockLevel { get; init; }

    public int ReorderPoint { get; init; }

    public int ShortageQty { get; init; }
}

public sealed class ProductionCostHistoryItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public DateTime StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public decimal StandardCost { get; init; }
}

public sealed class ProductionBomItemDto
{
    public int ProductAssemblyId { get; init; }

    public string AssemblyName { get; init; } = string.Empty;

    public int Components { get; init; }

    public decimal TotalPerAssemblyQty { get; init; }

    public int MaxBomLevel { get; init; }
}

public sealed class ProductionTransactionTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int Quantity { get; init; }

    public decimal ActualCost { get; init; }

    public int Transactions { get; init; }
}

public sealed class ProductionDashboardFilterOptionsDto
{
    public IReadOnlyList<ProductionFilterLookupItemDto> Products { get; init; } = [];

    public IReadOnlyList<ProductionFilterLookupItemDto> ProductCategories { get; init; } = [];

    public IReadOnlyList<ProductionLocationFilterLookupItemDto> Locations { get; init; } = [];

    public IReadOnlyList<ProductionFilterLookupItemDto> ScrapReasons { get; init; } = [];
}

public sealed record ProductionFilterLookupItemDto(int Id, string Name);

public sealed record ProductionLocationFilterLookupItemDto(short Id, string Name);

internal sealed class ProductionWorkOrderRow
{
    public int WorkOrderId { get; init; }

    public DateTime StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public DateTime DueDate { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public bool MakeFlag { get; init; }

    public bool FinishedGoodsFlag { get; init; }

    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public short SafetyStockLevel { get; init; }

    public short ReorderPoint { get; init; }

    public short? ScrapReasonId { get; init; }

    public bool IsOpen { get; init; }

    public bool IsDelayed { get; init; }
}

internal sealed class ProductionRoutingRow
{
    public int WorkOrderId { get; init; }

    public int ProductId { get; init; }

    public short OperationSequence { get; init; }

    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal ActualResourceHours { get; init; }
}

internal sealed class ProductionInventoryRow
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public int Quantity { get; init; }

    public int SafetyStockLevel { get; init; }

    public int ReorderPoint { get; init; }
}

internal sealed class ProductionCostHistoryRow
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public DateTime StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public decimal StandardCost { get; init; }
}

internal sealed class ProductionBomRow
{
    public int ProductAssemblyId { get; init; }

    public string AssemblyName { get; init; } = string.Empty;

    public int ComponentId { get; init; }

    public short BomLevel { get; init; }

    public decimal PerAssemblyQty { get; init; }
}

internal sealed class ProductionTransactionRow
{
    public DateTime TransactionDate { get; init; }

    public int ProductId { get; init; }

    public int Quantity { get; init; }

    public decimal ActualCost { get; init; }
}
