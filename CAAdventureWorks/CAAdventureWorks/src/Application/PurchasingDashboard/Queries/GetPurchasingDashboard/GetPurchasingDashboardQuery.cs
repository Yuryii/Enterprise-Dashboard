using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.PurchasingDashboard.Queries.GetPurchasingDashboard;

public sealed record GetPurchasingDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? VendorId = null,
    byte? Status = null,
    int? ShipMethodId = null,
    int? ProductId = null,
    bool? PreferredVendorOnly = null,
    bool? ActiveVendorOnly = null) : IRequest<PurchasingDashboardResponseDto>;

public sealed class GetPurchasingDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetPurchasingDashboardQuery, PurchasingDashboardResponseDto>
{
    public async Task<PurchasingDashboardResponseDto> Handle(GetPurchasingDashboardQuery request, CancellationToken cancellationToken)
    {
        var headers =
            from header in context.PurchaseOrderHeaders.AsNoTracking()
            join vendor in context.Vendors.AsNoTracking() on header.VendorId equals vendor.BusinessEntityId
            where !request.StartDate.HasValue || header.OrderDate >= request.StartDate.Value
            where !request.EndDate.HasValue || header.OrderDate <= request.EndDate.Value
            where !request.VendorId.HasValue || header.VendorId == request.VendorId.Value
            where !request.Status.HasValue || header.Status == request.Status.Value
            where !request.ShipMethodId.HasValue || header.ShipMethodId == request.ShipMethodId.Value
            where request.PreferredVendorOnly != true || vendor.PreferredVendorStatus
            where request.ActiveVendorOnly != true || vendor.ActiveFlag
            select new PurchasingHeaderRow
            {
                PurchaseOrderId = header.PurchaseOrderId,
                VendorId = header.VendorId,
                VendorName = vendor.Name,
                Status = header.Status,
                OrderDate = header.OrderDate,
                TotalDue = header.TotalDue,
                ShipMethodId = header.ShipMethodId
            };

        var details =
            from detail in context.PurchaseOrderDetails.AsNoTracking()
            join header in headers on detail.PurchaseOrderId equals header.PurchaseOrderId
            join product in context.Products.AsNoTracking() on detail.ProductId equals product.ProductId
            where !request.ProductId.HasValue || detail.ProductId == request.ProductId.Value
            select new PurchasingDashboardDetailRow
            {
                PurchaseOrderId = detail.PurchaseOrderId,
                VendorId = header.VendorId,
                VendorName = header.VendorName,
                Status = header.Status,
                ProductId = detail.ProductId,
                ProductName = product.Name,
                OrderQty = detail.OrderQty,
                UnitPrice = detail.UnitPrice,
                LineTotal = detail.LineTotal,
                ReceivedQty = detail.ReceivedQty,
                RejectedQty = detail.RejectedQty,
                StockedQty = detail.StockedQty
            };

        var filteredHeaders = headers;
        if (request.ProductId.HasValue)
        {
            var orderIds = details.Select(x => x.PurchaseOrderId).Distinct();
            filteredHeaders = filteredHeaders.Where(x => orderIds.Contains(x.PurchaseOrderId));
        }

        var overview = await BuildOverviewAsync(filteredHeaders, details, cancellationToken);
        var spendTrend = await BuildSpendTrendAsync(filteredHeaders, cancellationToken);
        var orderStatuses = await BuildOrderStatusesAsync(filteredHeaders, cancellationToken);
        var topVendors = await BuildTopVendorsAsync(filteredHeaders, cancellationToken);
        var topProducts = await BuildTopProductsAsync(details, cancellationToken);
        var vendorDeliveryRates = await BuildVendorDeliveryRatesAsync(details, cancellationToken);
        var vendorLeadTimes = await BuildVendorLeadTimesAsync(request, cancellationToken);
        var vendorsByRegion = await BuildVendorsByRegionAsync(request, cancellationToken);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new PurchasingDashboardResponseDto
        {
            Filters = new PurchasingDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                VendorId = request.VendorId,
                Status = request.Status,
                ShipMethodId = request.ShipMethodId,
                ProductId = request.ProductId,
                PreferredVendorOnly = request.PreferredVendorOnly,
                ActiveVendorOnly = request.ActiveVendorOnly
            },
            Overview = overview,
            SpendTrend = spendTrend,
            OrderStatuses = orderStatuses,
            TopVendors = topVendors,
            TopProducts = topProducts,
            VendorDeliveryRates = vendorDeliveryRates,
            VendorLeadTimes = vendorLeadTimes,
            VendorsByRegion = vendorsByRegion,
            FilterOptions = filterOptions
        };
    }

    private async Task<PurchasingOverviewDto> BuildOverviewAsync(
        IQueryable<PurchasingHeaderRow> headers,
        IQueryable<PurchasingDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        var headerAggregate = await headers
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalSpend = group.Sum(x => x.TotalDue),
                TotalOrders = group.Select(x => x.PurchaseOrderId).Distinct().Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        var detailAggregate = await details
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalOrderedQty = group.Sum(x => (int)x.OrderQty),
                ReceivedQty = group.Sum(x => x.ReceivedQty),
                RejectedQty = group.Sum(x => x.RejectedQty)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var activeVendors = await context.Vendors.AsNoTracking().CountAsync(x => x.ActiveFlag, cancellationToken);
        var preferredVendors = await context.Vendors.AsNoTracking().CountAsync(x => x.PreferredVendorStatus, cancellationToken);

        var totalOrders = headerAggregate?.TotalOrders ?? 0;
        var totalOrderedQty = detailAggregate?.TotalOrderedQty ?? 0;
        var receivedQty = detailAggregate?.ReceivedQty ?? 0m;

        return new PurchasingOverviewDto
        {
            TotalSpend = headerAggregate?.TotalSpend ?? 0m,
            TotalOrders = totalOrders,
            AverageOrderValue = totalOrders == 0 ? 0m : (headerAggregate?.TotalSpend ?? 0m) / totalOrders,
            TotalOrderedQty = totalOrderedQty,
            ReceiveRate = totalOrderedQty == 0 ? 0m : receivedQty / totalOrderedQty,
            RejectRate = receivedQty == 0 ? 0m : (detailAggregate?.RejectedQty ?? 0m) / receivedQty,
            ActiveVendors = activeVendors,
            PreferredVendors = preferredVendors
        };
    }

    private static async Task<IReadOnlyList<PurchasingTrendPointDto>> BuildSpendTrendAsync(
        IQueryable<PurchasingHeaderRow> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => new { x.OrderDate.Year, x.OrderDate.Month })
            .Select(group => new PurchasingTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                TotalSpend = group.Sum(x => x.TotalDue),
                Orders = group.Select(x => x.PurchaseOrderId).Distinct().Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<PurchasingStatusItemDto>> BuildOrderStatusesAsync(
        IQueryable<PurchasingHeaderRow> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => x.Status)
            .Select(group => new PurchasingStatusItemDto
            {
                Status = group.Key,
                StatusLabel = group.Key == 1 ? "Pending"
                    : group.Key == 2 ? "Approved"
                    : group.Key == 3 ? "Rejected"
                    : group.Key == 4 ? "Complete"
                    : "Unknown",
                Orders = group.Select(x => x.PurchaseOrderId).Distinct().Count(),
                TotalSpend = group.Sum(x => x.TotalDue)
            })
            .OrderBy(x => x.Status)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<PurchasingVendorItemDto>> BuildTopVendorsAsync(
        IQueryable<PurchasingHeaderRow> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => new { x.VendorId, x.VendorName })
            .Select(group => new PurchasingVendorItemDto
            {
                VendorId = group.Key.VendorId,
                VendorName = group.Key.VendorName,
                TotalSpend = group.Sum(x => x.TotalDue),
                Orders = group.Select(x => x.PurchaseOrderId).Distinct().Count(),
                AverageOrderValue = group.Select(x => x.PurchaseOrderId).Distinct().Count() == 0
                    ? 0m
                    : group.Sum(x => x.TotalDue) / group.Select(x => x.PurchaseOrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.TotalSpend)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<PurchasingProductItemDto>> BuildTopProductsAsync(
        IQueryable<PurchasingDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        return await details
            .GroupBy(x => new { x.ProductId, x.ProductName })
            .Select(group => new PurchasingProductItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                OrderedQty = group.Sum(x => (int)x.OrderQty),
                LineTotal = group.Sum(x => x.LineTotal),
                AverageUnitPrice = group.Sum(x => x.OrderQty) == 0
                    ? 0m
                    : group.Sum(x => x.LineTotal) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.LineTotal)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<PurchasingVendorRateItemDto>> BuildVendorDeliveryRatesAsync(
        IQueryable<PurchasingDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        return await details
            .GroupBy(x => new { x.VendorId, x.VendorName })
            .Select(group => new PurchasingVendorRateItemDto
            {
                VendorId = group.Key.VendorId,
                VendorName = group.Key.VendorName,
                ReceiveRate = group.Sum(x => x.OrderQty) == 0 ? 0m : group.Sum(x => x.ReceivedQty) / group.Sum(x => x.OrderQty),
                RejectRate = group.Sum(x => x.ReceivedQty) == 0 ? 0m : group.Sum(x => x.RejectedQty) / group.Sum(x => x.ReceivedQty),
                StockedRate = group.Sum(x => x.ReceivedQty) == 0 ? 0m : group.Sum(x => x.StockedQty) / group.Sum(x => x.ReceivedQty)
            })
            .OrderByDescending(x => x.ReceiveRate)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<PurchasingVendorLeadTimeItemDto>> BuildVendorLeadTimesAsync(
        GetPurchasingDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from pv in context.ProductVendors.AsNoTracking()
            join vendor in context.Vendors.AsNoTracking() on pv.BusinessEntityId equals vendor.BusinessEntityId
            where !request.VendorId.HasValue || pv.BusinessEntityId == request.VendorId.Value
            where !request.ProductId.HasValue || pv.ProductId == request.ProductId.Value
            where request.PreferredVendorOnly != true || vendor.PreferredVendorStatus
            where request.ActiveVendorOnly != true || vendor.ActiveFlag
            group new { pv, vendor } by new { pv.BusinessEntityId, vendor.Name } into grouped
            select new PurchasingVendorLeadTimeItemDto
            {
                VendorId = grouped.Key.BusinessEntityId,
                VendorName = grouped.Key.Name,
                AverageLeadTimeDays = grouped.Average(x => (double)x.pv.AverageLeadTime),
                ProductCount = grouped.Select(x => x.pv.ProductId).Distinct().Count(),
                AverageStandardPrice = grouped.Average(x => x.pv.StandardPrice)
            };

        return await query
            .OrderBy(x => x.AverageLeadTimeDays)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<PurchasingLocationItemDto>> BuildVendorsByRegionAsync(
        GetPurchasingDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from address in context.VVendorWithAddresses.AsNoTracking()
            join vendor in context.Vendors.AsNoTracking() on address.BusinessEntityId equals vendor.BusinessEntityId
            where !request.VendorId.HasValue || address.BusinessEntityId == request.VendorId.Value
            where request.PreferredVendorOnly != true || vendor.PreferredVendorStatus
            where request.ActiveVendorOnly != true || vendor.ActiveFlag
            group address by new { address.CountryRegionName, address.StateProvinceName } into grouped
            select new PurchasingLocationItemDto
            {
                Country = grouped.Key.CountryRegionName,
                StateProvince = grouped.Key.StateProvinceName,
                VendorCount = grouped.Select(x => x.BusinessEntityId).Distinct().Count()
            };

        return await query
            .OrderByDescending(x => x.VendorCount)
            .ThenBy(x => x.Country)
            .ThenBy(x => x.StateProvince)
            .Take(20)
            .ToListAsync(cancellationToken);
    }

    private async Task<PurchasingDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var vendors = await context.Vendors.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new PurchasingFilterLookupItemDto(x.BusinessEntityId, x.Name))
            .ToListAsync(cancellationToken);

        var shipMethods = await context.ShipMethods.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new PurchasingFilterLookupItemDto(x.ShipMethodId, x.Name))
            .ToListAsync(cancellationToken);

        var products = await context.Products.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new PurchasingFilterLookupItemDto(x.ProductId, x.Name))
            .ToListAsync(cancellationToken);

        return new PurchasingDashboardFilterOptionsDto
        {
            Vendors = vendors,
            ShipMethods = shipMethods,
            Products = products
        };
    }
}

internal sealed class PurchasingHeaderRow
{
    public int PurchaseOrderId { get; init; }

    public int VendorId { get; init; }

    public string VendorName { get; init; } = string.Empty;

    public byte Status { get; init; }

    public DateTime OrderDate { get; init; }

    public decimal TotalDue { get; init; }

    public int ShipMethodId { get; init; }
}
