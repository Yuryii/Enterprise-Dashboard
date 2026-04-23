namespace CAAdventureWorks.Application.SalesDashboard.Queries.GetSalesDashboard;

public sealed class SalesDashboardResponseDto
{
    public SalesDashboardAppliedFilterDto Filters { get; init; } = new();

    public SalesOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<RevenueTrendPointDto> RevenueTrend { get; init; } = [];

    public IReadOnlyList<SalesPerformanceItemDto> SalesByPerson { get; init; } = [];

    public IReadOnlyList<SalesPerformanceItemDto> SalesByTerritory { get; init; } = [];

    public IReadOnlyList<CategoryMixItemDto> CategoryMix { get; init; } = [];

    public IReadOnlyList<ProductPerformanceItemDto> TopProducts { get; init; } = [];

    public IReadOnlyList<TopCustomerItemDto> TopCustomers { get; init; } = [];

    public IReadOnlyList<CustomerSegmentItemDto> CustomerSegments { get; init; } = [];

    public IReadOnlyList<OrderStatusItemDto> OrderStatuses { get; init; } = [];

    public QuotaSummaryDto Quota { get; init; } = new();

    public ShippingSummaryDto Shipping { get; init; } = new();

    public IReadOnlyList<SalesReasonItemDto> SalesReasons { get; init; } = [];

    public SalesDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class SalesDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public int? TerritoryId { get; init; }

    public int? SalesPersonId { get; init; }

    public int? ProductCategoryId { get; init; }

    public bool? OnlineOrderFlag { get; init; }
}

public sealed class SalesOverviewDto
{
    public decimal TotalRevenue { get; init; }

    public decimal NetSales { get; init; }

    public int TotalOrders { get; init; }

    public int UnitsSold { get; init; }

    public decimal AverageOrderValue { get; init; }

    public decimal OnlineOrderRate { get; init; }

    public decimal CancellationRate { get; init; }

    public decimal OnTimeShippingRate { get; init; }

    public decimal DiscountRate { get; init; }

    public decimal FreightRatio { get; init; }
}

public sealed class RevenueTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public decimal Revenue { get; init; }

    public int Orders { get; init; }

    public decimal? GrowthRate { get; init; }
}

public sealed class SalesPerformanceItemDto
{
    public int Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string? Group { get; init; }

    public decimal Revenue { get; init; }

    public int Orders { get; init; }

    public decimal? Target { get; init; }

    public decimal? AchievementRate { get; init; }
}

public sealed class CategoryMixItemDto
{
    public string Category { get; init; } = string.Empty;

    public string Subcategory { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int UnitsSold { get; init; }
}

public sealed class ProductPerformanceItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int UnitsSold { get; init; }

    public decimal DiscountAmount { get; init; }
}

public sealed class CustomerSegmentItemDto
{
    public string Segment { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int Orders { get; init; }

    public int Customers { get; init; }
}

public sealed class TopCustomerItemDto
{
    public int CustomerId { get; init; }

    public string CustomerName { get; init; } = string.Empty;

    public string? AccountNumber { get; init; }

    public decimal Revenue { get; init; }

    public int Orders { get; init; }

    public decimal AverageOrderValue { get; init; }
}

public sealed class OrderStatusItemDto
{
    public int Status { get; init; }

    public string StatusLabel { get; init; } = string.Empty;

    public int Orders { get; init; }

    public decimal Revenue { get; init; }
}

public sealed class QuotaSummaryDto
{
    public decimal ActualSales { get; init; }

    public decimal TargetSales { get; init; }

    public decimal AchievementRate { get; init; }

    public decimal GapToTarget { get; init; }
}

public sealed class ShippingSummaryDto
{
    public decimal OnTimeRate { get; init; }

    public double AverageLeadTimeDays { get; init; }

    public decimal FreightTotal { get; init; }

    public decimal FreightPerOrder { get; init; }
}

public sealed class SalesReasonItemDto
{
    public int SalesReasonId { get; init; }

    public string Name { get; init; } = string.Empty;

    public string ReasonType { get; init; } = string.Empty;

    public decimal Revenue { get; init; }

    public int Orders { get; init; }
}

public sealed class SalesDashboardFilterOptionsDto
{
    public IReadOnlyList<FilterLookupItemDto> Territories { get; init; } = [];

    public IReadOnlyList<FilterLookupItemDto> SalesPeople { get; init; } = [];

    public IReadOnlyList<FilterLookupItemDto> Categories { get; init; } = [];
}

public sealed record FilterLookupItemDto(int Id, string Name);

internal sealed class SalesDashboardDetailRow
{
    public int SalesOrderId { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int? CategoryId { get; init; }

    public string CategoryName { get; init; } = string.Empty;

    public string SubcategoryName { get; init; } = string.Empty;

    public short OrderQty { get; init; }

    public decimal UnitPrice { get; init; }

    public decimal UnitPriceDiscount { get; init; }

    public decimal LineTotal { get; init; }
}
