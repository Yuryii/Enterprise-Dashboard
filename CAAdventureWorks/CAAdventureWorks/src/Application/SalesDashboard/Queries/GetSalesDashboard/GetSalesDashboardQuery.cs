using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.SalesDashboard.Queries.GetSalesDashboard;

public sealed record GetSalesDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? TerritoryId = null,
    int? SalesPersonId = null,
    int? ProductCategoryId = null,
    bool? OnlineOrderFlag = null) : IRequest<SalesDashboardResponseDto>;

public sealed class GetSalesDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetSalesDashboardQuery, SalesDashboardResponseDto>
{
    public async Task<SalesDashboardResponseDto> Handle(GetSalesDashboardQuery request, CancellationToken cancellationToken)
    {
        var headers = context.SalesOrderHeaders
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.OrderDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.OrderDate <= request.EndDate.Value)
            .Where(x => !request.TerritoryId.HasValue || x.TerritoryId == request.TerritoryId.Value)
            .Where(x => !request.SalesPersonId.HasValue || x.SalesPersonId == request.SalesPersonId.Value)
            .Where(x => !request.OnlineOrderFlag.HasValue || x.OnlineOrderFlag == request.OnlineOrderFlag.Value);

        var details =
            from detail in context.SalesOrderDetails.AsNoTracking()
            join header in headers on detail.SalesOrderId equals header.SalesOrderId
            join product in context.Products.AsNoTracking() on detail.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking()
                on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking()
                on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            select new SalesDashboardDetailRow
            {
                SalesOrderId = detail.SalesOrderId,
                ProductId = detail.ProductId,
                ProductName = product.Name,
                CategoryId = category != null ? category.ProductCategoryId : null,
                CategoryName = category != null ? category.Name : "Uncategorized",
                SubcategoryName = subcategory != null ? subcategory.Name : "Uncategorized",
                OrderQty = detail.OrderQty,
                UnitPrice = detail.UnitPrice,
                UnitPriceDiscount = detail.UnitPriceDiscount,
                LineTotal = detail.LineTotal
            };

        if (request.ProductCategoryId.HasValue)
        {
            details = details.Where(x => x.CategoryId == request.ProductCategoryId.Value);

            var matchedOrderIds = details
                .Select(x => x.SalesOrderId)
                .Distinct();

            headers = headers.Where(x => matchedOrderIds.Contains(x.SalesOrderId));
        }

        var overview = await BuildOverviewAsync(headers, details, cancellationToken);
        var revenueTrend = await BuildRevenueTrendAsync(headers, cancellationToken);
        var salesByPerson = await BuildSalesByPersonAsync(headers, cancellationToken);
        var salesByTerritory = await BuildSalesByTerritoryAsync(headers, cancellationToken);
        var categoryMix = await BuildCategoryMixAsync(details, cancellationToken);
        var topProducts = await BuildTopProductsAsync(details, cancellationToken);
        var customerSegments = await BuildCustomerSegmentsAsync(headers, cancellationToken);
        var orderStatuses = await BuildOrderStatusesAsync(headers, cancellationToken);
        var quota = await BuildQuotaAsync(request, headers, cancellationToken);
        var shipping = await BuildShippingAsync(headers, cancellationToken);
        var salesReasons = await BuildSalesReasonsAsync(headers, cancellationToken);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new SalesDashboardResponseDto
        {
            Filters = new SalesDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                TerritoryId = request.TerritoryId,
                SalesPersonId = request.SalesPersonId,
                ProductCategoryId = request.ProductCategoryId,
                OnlineOrderFlag = request.OnlineOrderFlag
            },
            Overview = overview,
            RevenueTrend = revenueTrend,
            SalesByPerson = salesByPerson,
            SalesByTerritory = salesByTerritory,
            CategoryMix = categoryMix,
            TopProducts = topProducts,
            CustomerSegments = customerSegments,
            OrderStatuses = orderStatuses,
            Quota = quota,
            Shipping = shipping,
            SalesReasons = salesReasons,
            FilterOptions = filterOptions
        };
    }

    private static async Task<SalesOverviewDto> BuildOverviewAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        IQueryable<SalesDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        var headerAggregate = await headers
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalRevenue = group.Sum(x => x.TotalDue),
                NetSales = group.Sum(x => x.SubTotal),
                TotalOrders = group.Select(x => x.SalesOrderId).Distinct().Count(),
                OnlineOrders = group.Count(x => x.OnlineOrderFlag),
                CancelledOrders = group.Count(x => x.Status == 6),
                ShippedOrders = group.Count(x => x.ShipDate != null),
                OnTimeOrders = group.Count(x => x.ShipDate != null && x.ShipDate <= x.DueDate),
                FreightTotal = group.Sum(x => x.Freight)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var detailAggregate = await details
            .GroupBy(_ => 1)
            .Select(group => new
            {
                UnitsSold = group.Sum(x => (int)x.OrderQty),
                GrossSales = group.Sum(x => x.UnitPrice * x.OrderQty),
                DiscountAmount = group.Sum(x => x.UnitPrice * x.UnitPriceDiscount * x.OrderQty)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalOrders = headerAggregate?.TotalOrders ?? 0;
        var totalRevenue = headerAggregate?.TotalRevenue ?? 0m;
        var shippedOrders = headerAggregate?.ShippedOrders ?? 0;
        var grossSales = detailAggregate?.GrossSales ?? 0m;
        var discountAmount = detailAggregate?.DiscountAmount ?? 0m;

        return new SalesOverviewDto
        {
            TotalRevenue = totalRevenue,
            NetSales = headerAggregate?.NetSales ?? 0m,
            TotalOrders = totalOrders,
            UnitsSold = detailAggregate?.UnitsSold ?? 0,
            AverageOrderValue = totalOrders == 0 ? 0m : totalRevenue / totalOrders,
            OnlineOrderRate = totalOrders == 0 ? 0m : (decimal)(headerAggregate?.OnlineOrders ?? 0) / totalOrders,
            CancellationRate = totalOrders == 0 ? 0m : (decimal)(headerAggregate?.CancelledOrders ?? 0) / totalOrders,
            OnTimeShippingRate = shippedOrders == 0 ? 0m : (decimal)(headerAggregate?.OnTimeOrders ?? 0) / shippedOrders,
            DiscountRate = grossSales == 0 ? 0m : discountAmount / grossSales,
            FreightRatio = totalRevenue == 0 ? 0m : (headerAggregate?.FreightTotal ?? 0m) / totalRevenue
        };
    }

    private static async Task<IReadOnlyList<RevenueTrendPointDto>> BuildRevenueTrendAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => new { x.OrderDate.Year, x.OrderDate.Month })
            .Select(group => new RevenueTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Revenue = group.Sum(x => x.TotalDue),
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<SalesPerformanceItemDto>> BuildSalesByPersonAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await (
                from header in headers
                where header.SalesPersonId != null
                join salesPerson in context.VSalesPeople.AsNoTracking()
                    on header.SalesPersonId equals salesPerson.BusinessEntityId
                group new { header, salesPerson } by new
                {
                    salesPerson.BusinessEntityId,
                    salesPerson.FirstName,
                    salesPerson.LastName,
                    salesPerson.TerritoryName,
                    salesPerson.SalesQuota
                }
                into grouped
                orderby grouped.Sum(x => x.header.TotalDue) descending
                select new SalesPerformanceItemDto
                {
                    Id = grouped.Key.BusinessEntityId,
                    Name = grouped.Key.FirstName + " " + grouped.Key.LastName,
                    Group = grouped.Key.TerritoryName,
                    Revenue = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count(),
                    Target = grouped.Key.SalesQuota,
                    AchievementRate = grouped.Key.SalesQuota.HasValue && grouped.Key.SalesQuota.Value > 0
                        ? grouped.Sum(x => x.header.TotalDue) / grouped.Key.SalesQuota.Value
                        : null
                })
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<SalesPerformanceItemDto>> BuildSalesByTerritoryAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .Where(x => x.Territory != null)
            .GroupBy(x => new { Id = x.TerritoryId ?? 0, x.Territory!.Name, x.Territory.Group })
            .Select(group => new SalesPerformanceItemDto
            {
                Id = group.Key.Id,
                Name = group.Key.Name,
                Group = group.Key.Group,
                Revenue = group.Sum(x => x.TotalDue),
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<CategoryMixItemDto>> BuildCategoryMixAsync(
        IQueryable<SalesDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        return await details
            .GroupBy(x => new { x.CategoryName, x.SubcategoryName })
            .Select(group => new CategoryMixItemDto
            {
                Category = group.Key.CategoryName,
                Subcategory = group.Key.SubcategoryName,
                Revenue = group.Sum(x => x.LineTotal),
                UnitsSold = group.Sum(x => (int)x.OrderQty)
            })
            .OrderByDescending(x => x.Revenue)
            .Take(15)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductPerformanceItemDto>> BuildTopProductsAsync(
        IQueryable<SalesDashboardDetailRow> details,
        CancellationToken cancellationToken)
    {
        return await details
            .GroupBy(x => new { x.ProductId, x.ProductName, x.CategoryName })
            .Select(group => new ProductPerformanceItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                Category = group.Key.CategoryName,
                Revenue = group.Sum(x => x.LineTotal),
                UnitsSold = group.Sum(x => (int)x.OrderQty),
                DiscountAmount = group.Sum(x => x.UnitPrice * x.UnitPriceDiscount * x.OrderQty)
            })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<CustomerSegmentItemDto>> BuildCustomerSegmentsAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => x.Customer.StoreId != null ? "Reseller / B2B" : "Individual / B2C")
            .Select(group => new CustomerSegmentItemDto
            {
                Segment = group.Key,
                Revenue = group.Sum(x => x.TotalDue),
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count(),
                Customers = group.Select(x => x.CustomerId).Distinct().Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<OrderStatusItemDto>> BuildOrderStatusesAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await headers
            .GroupBy(x => x.Status)
            .Select(group => new OrderStatusItemDto
            {
                Status = group.Key,
                StatusLabel = group.Key == 1 ? "In Process"
                    : group.Key == 2 ? "Approved"
                    : group.Key == 3 ? "Backordered"
                    : group.Key == 4 ? "Rejected"
                    : group.Key == 5 ? "Shipped"
                    : group.Key == 6 ? "Cancelled"
                    : "Unknown",
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count(),
                Revenue = group.Sum(x => x.TotalDue)
            })
            .OrderBy(x => x.Status)
            .ToListAsync(cancellationToken);
    }

    private async Task<QuotaSummaryDto> BuildQuotaAsync(
        GetSalesDashboardQuery request,
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var actualSales = await headers.SumAsync(x => x.TotalDue, cancellationToken);

        var quotaQuery = context.SalesPersonQuotaHistories
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.QuotaDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.QuotaDate <= request.EndDate.Value)
            .Where(x => !request.SalesPersonId.HasValue || x.BusinessEntityId == request.SalesPersonId.Value);

        if (request.TerritoryId.HasValue)
        {
            quotaQuery = quotaQuery.Where(x => x.BusinessEntity.TerritoryId == request.TerritoryId.Value);
        }

        var targetSales = await quotaQuery.SumAsync(x => (decimal?)x.SalesQuota, cancellationToken) ?? 0m;

        return new QuotaSummaryDto
        {
            ActualSales = actualSales,
            TargetSales = targetSales,
            AchievementRate = targetSales == 0 ? 0m : actualSales / targetSales,
            GapToTarget = targetSales - actualSales
        };
    }

    private static async Task<ShippingSummaryDto> BuildShippingAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var aggregate = await headers
            .Where(x => x.ShipDate != null)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalShippedOrders = group.Count(),
                OnTimeOrders = group.Count(x => x.ShipDate <= x.DueDate),
                FreightTotal = group.Sum(x => x.Freight),
                AverageLeadTimeDays = group.Average(x => x.ShipDate!.Value.Subtract(x.OrderDate).TotalDays)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var shippedOrders = aggregate?.TotalShippedOrders ?? 0;

        return new ShippingSummaryDto
        {
            OnTimeRate = shippedOrders == 0 ? 0m : (decimal)(aggregate?.OnTimeOrders ?? 0) / shippedOrders,
            AverageLeadTimeDays = aggregate?.AverageLeadTimeDays ?? 0,
            FreightTotal = aggregate?.FreightTotal ?? 0m,
            FreightPerOrder = shippedOrders == 0 ? 0m : (aggregate?.FreightTotal ?? 0m) / shippedOrders
        };
    }

    private async Task<IReadOnlyList<SalesReasonItemDto>> BuildSalesReasonsAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var headerIds = headers.Select(x => x.SalesOrderId);

        return await (
                from relation in context.SalesOrderHeaderSalesReasons.AsNoTracking()
                join reason in context.SalesReasons.AsNoTracking() on relation.SalesReasonId equals reason.SalesReasonId
                join header in context.SalesOrderHeaders.AsNoTracking() on relation.SalesOrderId equals header.SalesOrderId
                where headerIds.Contains(relation.SalesOrderId)
                group new { relation, reason, header } by new { reason.SalesReasonId, reason.Name, reason.ReasonType }
                into grouped
                orderby grouped.Sum(x => x.header.TotalDue) descending
                select new SalesReasonItemDto
                {
                    SalesReasonId = grouped.Key.SalesReasonId,
                    Name = grouped.Key.Name,
                    ReasonType = grouped.Key.ReasonType,
                    Revenue = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.relation.SalesOrderId).Distinct().Count()
                })
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private async Task<SalesDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var territories = await context.SalesTerritories
            .AsNoTracking()
            .OrderBy(x => x.Group)
            .ThenBy(x => x.Name)
            .Select(x => new FilterLookupItemDto(x.TerritoryId, x.Name))
            .ToListAsync(cancellationToken);

        var salesPeople = await context.VSalesPeople
            .AsNoTracking()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new FilterLookupItemDto(x.BusinessEntityId, x.FirstName + " " + x.LastName))
            .ToListAsync(cancellationToken);

        var categories = await context.ProductCategories
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new FilterLookupItemDto(x.ProductCategoryId, x.Name))
            .ToListAsync(cancellationToken);

        return new SalesDashboardFilterOptionsDto
        {
            Territories = territories,
            SalesPeople = salesPeople,
            Categories = categories
        };
    }
}
