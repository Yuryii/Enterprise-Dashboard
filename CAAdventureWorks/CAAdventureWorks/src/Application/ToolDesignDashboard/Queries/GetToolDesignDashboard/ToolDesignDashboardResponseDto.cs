namespace CAAdventureWorks.Application.ToolDesignDashboard.Queries.GetToolDesignDashboard;

public sealed class ToolDesignDashboardResponseDto
{
    public ToolDesignDashboardAppliedFilterDto Filters { get; init; } = new();

    public ToolDesignOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<ToolDesignModelCountItemDto> ModelsByProductCount { get; init; } = [];

    public IReadOnlyList<ToolDesignStatusItemDto> InstructionCoverage { get; init; } = [];

    public IReadOnlyList<ToolDesignComplexityItemDto> TopComplexModels { get; init; } = [];

    public IReadOnlyList<ToolDesignCostItemDto> TopCostModels { get; init; } = [];

    public IReadOnlyList<ToolDesignCategoryMixItemDto> CategoryMix { get; init; } = [];

    public IReadOnlyList<ToolDesignLocationLoadItemDto> LocationLoads { get; init; } = [];

    public IReadOnlyList<ToolDesignCostVarianceItemDto> LocationCostVariances { get; init; } = [];

    public IReadOnlyList<ToolDesignLeadTimeItemDto> VendorLeadTimes { get; init; } = [];

    public IReadOnlyList<ToolDesignBomComplexityItemDto> BomComplexities { get; init; } = [];

    public IReadOnlyList<ToolDesignInventorySupportItemDto> InventorySupport { get; init; } = [];

    public ToolDesignDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class ToolDesignDashboardAppliedFilterDto
{
    public int? ProductModelId { get; init; }

    public int? ProductId { get; init; }

    public int? ProductCategoryId { get; init; }

    public short? LocationId { get; init; }

    public int? VendorId { get; init; }

    public bool? MakeOnly { get; init; }

    public bool? FinishedGoodsOnly { get; init; }

    public int? MinDaysToManufacture { get; init; }

    public decimal? MinStandardCost { get; init; }
}

public sealed class ToolDesignOverviewDto
{
    public int TotalModels { get; init; }

    public int TotalProducts { get; init; }

    public int ModelsWithInstructions { get; init; }

    public decimal InstructionCoverageRate { get; init; }

    public int ComplexModels { get; init; }

    public int VendorDependentProducts { get; init; }

    public int ActiveWorkCenters { get; init; }

    public int BomAssemblies { get; init; }
}

public sealed class ToolDesignModelCountItemDto
{
    public int ProductModelId { get; init; }

    public string ModelName { get; init; } = string.Empty;

    public int ProductCount { get; init; }
}

public sealed class ToolDesignStatusItemDto
{
    public string Status { get; init; } = string.Empty;

    public int Models { get; init; }
}

public sealed class ToolDesignComplexityItemDto
{
    public int ProductModelId { get; init; }

    public string ModelName { get; init; } = string.Empty;

    public decimal AverageDaysToManufacture { get; init; }

    public decimal AverageStandardCost { get; init; }

    public int ProductCount { get; init; }
}

public sealed class ToolDesignCostItemDto
{
    public int ProductModelId { get; init; }

    public string ModelName { get; init; } = string.Empty;

    public decimal AverageStandardCost { get; init; }

    public decimal MaxStandardCost { get; init; }
}

public sealed class ToolDesignCategoryMixItemDto
{
    public int ProductCategoryId { get; init; }

    public string CategoryName { get; init; } = string.Empty;

    public int Models { get; init; }

    public int Products { get; init; }
}

public sealed class ToolDesignLocationLoadItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public int RoutingSteps { get; init; }

    public int WorkOrders { get; init; }
}

public sealed class ToolDesignCostVarianceItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal CostVariance { get; init; }
}

public sealed class ToolDesignLeadTimeItemDto
{
    public int Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public decimal AverageLeadTime { get; init; }

    public int ProductCount { get; init; }
}

public sealed class ToolDesignBomComplexityItemDto
{
    public int ProductAssemblyId { get; init; }

    public string AssemblyName { get; init; } = string.Empty;

    public int Components { get; init; }

    public decimal TotalPerAssemblyQty { get; init; }

    public short MaxBomLevel { get; init; }
}

public sealed class ToolDesignInventorySupportItemDto
{
    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public int InventoryQty { get; init; }

    public int DistinctProducts { get; init; }
}

public sealed class ToolDesignDashboardFilterOptionsDto
{
    public IReadOnlyList<ToolDesignFilterLookupItemDto> ProductModels { get; init; } = [];

    public IReadOnlyList<ToolDesignFilterLookupItemDto> Products { get; init; } = [];

    public IReadOnlyList<ToolDesignFilterLookupItemDto> ProductCategories { get; init; } = [];

    public IReadOnlyList<ToolDesignLocationFilterLookupItemDto> Locations { get; init; } = [];

    public IReadOnlyList<ToolDesignFilterLookupItemDto> Vendors { get; init; } = [];
}

public sealed record ToolDesignFilterLookupItemDto(int Id, string Name);

public sealed record ToolDesignLocationFilterLookupItemDto(int Id, string Name);

internal sealed class ToolDesignProductRow
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int? ProductModelId { get; init; }

    public string ModelName { get; init; } = string.Empty;

    public int? ProductCategoryId { get; init; }

    public string CategoryName { get; init; } = string.Empty;

    public bool MakeFlag { get; init; }

    public bool FinishedGoodsFlag { get; init; }

    public int DaysToManufacture { get; init; }

    public decimal StandardCost { get; init; }

    public bool HasInstructions { get; init; }
}

internal sealed class ToolDesignRoutingRow
{
    public int WorkOrderId { get; init; }

    public int ProductId { get; init; }

    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }
}
