namespace CAAdventureWorks.Application.PurchasingDashboard.Queries.GetPurchasingDashboard;

public sealed class PurchasingDashboardResponseDto
{
    public PurchasingDashboardAppliedFilterDto Filters { get; init; } = new();

    public PurchasingOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<PurchasingTrendPointDto> SpendTrend { get; init; } = [];

    public IReadOnlyList<PurchasingStatusItemDto> OrderStatuses { get; init; } = [];

    public IReadOnlyList<PurchasingVendorItemDto> TopVendors { get; init; } = [];

    public IReadOnlyList<PurchasingProductItemDto> TopProducts { get; init; } = [];

    public IReadOnlyList<PurchasingVendorRateItemDto> VendorDeliveryRates { get; init; } = [];

    public IReadOnlyList<PurchasingVendorLeadTimeItemDto> VendorLeadTimes { get; init; } = [];

    public IReadOnlyList<PurchasingLocationItemDto> VendorsByRegion { get; init; } = [];

    public PurchasingDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class PurchasingDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public int? VendorId { get; init; }

    public byte? Status { get; init; }

    public int? ShipMethodId { get; init; }

    public int? ProductId { get; init; }

    public bool? PreferredVendorOnly { get; init; }

    public bool? ActiveVendorOnly { get; init; }
}

public sealed class PurchasingOverviewDto
{
    public decimal TotalSpend { get; init; }

    public int TotalOrders { get; init; }

    public decimal AverageOrderValue { get; init; }

    public int TotalOrderedQty { get; init; }

    public decimal ReceiveRate { get; init; }

    public decimal RejectRate { get; init; }

    public int ActiveVendors { get; init; }

    public int PreferredVendors { get; init; }
}

public sealed class PurchasingTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public decimal TotalSpend { get; init; }

    public int Orders { get; init; }
}

public sealed class PurchasingStatusItemDto
{
    public byte Status { get; init; }

    public string StatusLabel { get; init; } = string.Empty;

    public int Orders { get; init; }

    public decimal TotalSpend { get; init; }
}

public sealed class PurchasingVendorItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal TotalSpend { get; init; }

    public int Orders { get; init; }

    public decimal AverageOrderValue { get; init; }
}

public sealed class PurchasingProductItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int OrderedQty { get; init; }

    public decimal LineTotal { get; init; }

    public decimal AverageUnitPrice { get; init; }
}

public sealed class PurchasingVendorRateItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public decimal ReceiveRate { get; init; }

    public decimal RejectRate { get; init; }

    public decimal StockedRate { get; init; }
}

public sealed class PurchasingVendorLeadTimeItemDto
{
    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public double AverageLeadTimeDays { get; init; }

    public int ProductCount { get; init; }

    public decimal AverageStandardPrice { get; init; }
}

public sealed class PurchasingLocationItemDto
{
    public string Country { get; init; } = string.Empty;

    public string StateProvince { get; init; } = string.Empty;

    public int VendorCount { get; init; }
}

public sealed class PurchasingDashboardFilterOptionsDto
{
    public IReadOnlyList<PurchasingFilterLookupItemDto> Vendors { get; init; } = [];

    public IReadOnlyList<PurchasingFilterLookupItemDto> ShipMethods { get; init; } = [];

    public IReadOnlyList<PurchasingFilterLookupItemDto> Products { get; init; } = [];
}

public sealed record PurchasingFilterLookupItemDto(int Id, string Name);

internal sealed class PurchasingDashboardDetailRow
{
    public int PurchaseOrderId { get; init; }

    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public byte Status { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public short OrderQty { get; init; }

    public decimal UnitPrice { get; init; }

    public decimal LineTotal { get; init; }

    public decimal ReceivedQty { get; init; }

    public decimal RejectedQty { get; init; }

    public decimal StockedQty { get; init; }
}
