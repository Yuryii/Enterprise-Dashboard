namespace CAAdventureWorks.Application.ExecutiveDashboard.Queries.GetExecutiveDashboard;

public sealed class ExecutiveDashboardResponseDto
{
    public ExecutiveDashboardAppliedFilterDto Filters { get; init; } = new();

    public ExecutiveOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<ExecutiveTrendPointDto> RevenueVsSpendTrend { get; init; } = [];

    public IReadOnlyList<ExecutiveTerritoryRevenueItemDto> RevenueByTerritory { get; init; } = [];

    public IReadOnlyList<ExecutiveSalesPersonItemDto> TopSalesPeople { get; init; } = [];

    public IReadOnlyList<ExecutiveDepartmentHeadcountItemDto> HeadcountByDepartment { get; init; } = [];

    public IReadOnlyList<ExecutiveHeadcountGroupItemDto> HeadcountByGroup { get; init; } = [];

    public IReadOnlyList<ExecutiveVendorSpendItemDto> TopVendors { get; init; } = [];

    public IReadOnlyList<ExecutiveVendorReceivingRateItemDto> VendorReceivingRates { get; init; } = [];

    public IReadOnlyList<ExecutiveProductionCategoryItemDto> ProductionByCategory { get; init; } = [];

    public IReadOnlyList<ExecutiveOrderStatusItemDto> SalesOrderStatuses { get; init; } = [];

    public IReadOnlyList<ExecutiveOrderStatusItemDto> PurchaseOrderStatuses { get; init; } = [];

    public ExecutiveDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class ExecutiveDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public int? TerritoryId { get; init; }

    public int? SalesPersonId { get; init; }

    public int? VendorId { get; init; }

    public short? DepartmentId { get; init; }

    public int? ProductCategoryId { get; init; }

    public bool? CurrentEmployeesOnly { get; init; }
}

public sealed class ExecutiveOverviewDto
{
    public decimal TotalRevenue { get; init; }

    public decimal TotalSpend { get; init; }

    public decimal OperatingGap { get; init; }

    public int SalesOrders { get; init; }

    public int PurchaseOrders { get; init; }

    public int ActiveEmployees { get; init; }

    public int WorkOrders { get; init; }

    public decimal ProductionCompletionRate { get; init; }

    public decimal ProductionScrapRate { get; init; }
}

public sealed class ExecutiveTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public decimal Revenue { get; init; }

    public decimal Spend { get; init; }

    public decimal OperatingGap { get; init; }
}

public sealed class ExecutiveTerritoryRevenueItemDto
{
    public int TerritoryId { get; init; }

    public string TerritoryName { get; init; } = string.Empty;

    public string TerritoryGroup { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int Orders { get; init; }
}

public sealed class ExecutiveSalesPersonItemDto
{
    public int SalesPersonId { get; init; }

    public string SalesPersonName { get; init; } = string.Empty;

    public string TerritoryName { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int Orders { get; init; }

    public decimal? SalesQuota { get; init; }

    public decimal? AchievementRate { get; init; }
}

public sealed class ExecutiveDepartmentHeadcountItemDto
{
    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public string GroupName { get; init; } = string.Empty;

    public int Headcount { get; init; }
}

public sealed class ExecutiveHeadcountGroupItemDto
{
    public string GroupName { get; init; } = string.Empty;

    public int Headcount { get; init; }
}

public sealed class ExecutiveVendorSpendItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal TotalSpend { get; init; }

    public int Orders { get; init; }

    public decimal AverageOrderValue { get; init; }
}

public sealed class ExecutiveVendorReceivingRateItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal ReceivingRate { get; init; }

    public decimal ReceivedQty { get; init; }

    public decimal OrderedQty { get; init; }
}

public sealed class ExecutiveProductionCategoryItemDto
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

public sealed class ExecutiveOrderStatusItemDto
{
    public string Source { get; init; } = string.Empty;

    public int Status { get; init; }

    public string StatusLabel { get; init; } = string.Empty;

    public int Orders { get; init; }
}

public sealed class ExecutiveDashboardFilterOptionsDto
{
    public IReadOnlyList<ExecutiveFilterLookupItemDto> Territories { get; init; } = [];

    public IReadOnlyList<ExecutiveFilterLookupItemDto> SalesPeople { get; init; } = [];

    public IReadOnlyList<ExecutiveFilterLookupItemDto> Vendors { get; init; } = [];

    public IReadOnlyList<ExecutiveDepartmentFilterLookupItemDto> Departments { get; init; } = [];

    public IReadOnlyList<ExecutiveFilterLookupItemDto> ProductCategories { get; init; } = [];
}

public sealed record ExecutiveFilterLookupItemDto(int Id, string Name);

public sealed record ExecutiveDepartmentFilterLookupItemDto(short Id, string Name, string GroupName);

internal sealed class ExecutiveSalesHeaderRow
{
    public int SalesOrderId { get; init; }

    public DateTime OrderDate { get; init; }

    public int? TerritoryId { get; init; }

    public int? SalesPersonId { get; init; }

    public byte Status { get; init; }

    public decimal TotalDue { get; init; }
}

internal sealed class ExecutivePurchaseHeaderRow
{
    public int PurchaseOrderId { get; init; }

    public DateTime OrderDate { get; init; }

    public int VendorId { get; init; }

    public byte Status { get; init; }

    public decimal TotalDue { get; init; }
}

internal sealed class ExecutiveDepartmentRow
{
    public int BusinessEntityId { get; init; }

    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public string GroupName { get; init; } = string.Empty;
}

internal sealed class ExecutiveWorkOrderRow
{
    public int WorkOrderId { get; init; }

    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }
}
