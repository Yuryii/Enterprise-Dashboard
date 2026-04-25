namespace CAAdventureWorks.Application.QualityAssuranceDashboard.Queries.GetQualityAssuranceDashboard;

public sealed class QualityAssuranceDashboardResponseDto
{
    public QualityAssuranceDashboardAppliedFilterDto Filters { get; init; } = new();

    public QualityAssuranceOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<QualityTrendPointDto> DefectTrend { get; init; } = [];

    public IReadOnlyList<QualityScrapReasonItemDto> TopScrapReasons { get; init; } = [];

    public IReadOnlyList<QualityProductItemDto> TopDefectProducts { get; init; } = [];

    public IReadOnlyList<QualityCategoryItemDto> DefectsByCategory { get; init; } = [];

    public IReadOnlyList<QualityLocationItemDto> DefectsByLocation { get; init; } = [];

    public IReadOnlyList<QualityVendorItemDto> VendorRejectRates { get; init; } = [];

    public IReadOnlyList<QualityDepartmentItemDto> InspectorHeadcount { get; init; } = [];

    public QualityAssuranceDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class QualityAssuranceDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public short? ScrapReasonId { get; init; }

    public int? ProductCategoryId { get; init; }

    public short? LocationId { get; init; }

    public int? VendorId { get; init; }

    public bool? CurrentInspectorsOnly { get; init; }
}

public sealed class QualityAssuranceOverviewDto
{
    public int TotalWorkOrders { get; init; }

    public int TotalOrderQty { get; init; }

    public int TotalScrappedQty { get; init; }

    public decimal ScrapRate { get; init; }

    public decimal CompletionRate { get; init; }

    public int OrdersWithDefects { get; init; }

    public int ActiveInspectors { get; init; }

    public decimal VendorRejectRate { get; init; }
}

public sealed class QualityTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int WorkOrders { get; init; }

    public int ScrappedQty { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class QualityScrapReasonItemDto
{
    public short ScrapReasonId { get; init; }

    public string ScrapReasonName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }

    public int ScrappedQty { get; init; }
}

public sealed class QualityProductItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string ProductCategoryName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }

    public int ScrappedQty { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class QualityCategoryItemDto
{
    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int WorkOrders { get; init; }

    public int ScrappedQty { get; init; }

    public decimal ScrapRate { get; init; }
}

public sealed class QualityLocationItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal ActualResourceHours { get; init; }

    public int WorkOrders { get; init; }
}

public sealed class QualityVendorItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal ReceivedQty { get; init; }

    public decimal RejectedQty { get; init; }

    public decimal RejectRate { get; init; }
}

public sealed class QualityDepartmentItemDto
{
    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public string GroupName { get; init; } = string.Empty;

    public int Headcount { get; init; }
}

public sealed class QualityAssuranceDashboardFilterOptionsDto
{
    public IReadOnlyList<QualityFilterLookupItemDto> ScrapReasons { get; init; } = [];

    public IReadOnlyList<QualityFilterLookupItemDto> ProductCategories { get; init; } = [];

    public IReadOnlyList<QualityLocationFilterLookupItemDto> Locations { get; init; } = [];

    public IReadOnlyList<QualityFilterLookupItemDto> Vendors { get; init; } = [];
}

public sealed record QualityFilterLookupItemDto(int Id, string Name);

public sealed record QualityLocationFilterLookupItemDto(short Id, string Name);

internal sealed class QualityWorkOrderRow
{
    public int WorkOrderId { get; init; }

    public DateTime StartDate { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public short? ScrapReasonId { get; init; }

    public string ScrapReasonName { get; init; } = string.Empty;
}

internal sealed class QualityRoutingRow
{
    public int WorkOrderId { get; init; }

    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal ActualResourceHours { get; init; }
}

internal sealed class QualityVendorDetailRow
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal ReceivedQty { get; init; }

    public decimal RejectedQty { get; init; }
}

internal sealed class QualityDepartmentRow
{
    public int BusinessEntityId { get; init; }

    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public string GroupName { get; init; } = string.Empty;
}
