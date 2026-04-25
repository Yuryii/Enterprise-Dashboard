using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Application.SalesDashboard.Queries.GetSalesDashboard;

public sealed record GetSalesDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? TerritoryId = null,
    int? SalesPersonId = null,
    int? ProductCategoryId = null,
    bool? OnlineOrderFlag = null) : IRequest<SalesDashboardResponseDto>;

public sealed class GetSalesDashboardQueryHandler(IApplicationDbContext context, ILogger<GetSalesDashboardQueryHandler> logger)
    : IRequestHandler<GetSalesDashboardQuery, SalesDashboardResponseDto>
{
    public async Task<SalesDashboardResponseDto> Handle(GetSalesDashboardQuery request, CancellationToken cancellationToken)
    {
        try
        {
            logger.LogInformation("🔍 [Sales Dashboard] Bắt đầu tải dữ liệu với filters: StartDate={StartDate}, EndDate={EndDate}, TerritoryId={TerritoryId}, SalesPersonId={SalesPersonId}, ProductCategoryId={ProductCategoryId}, OnlineOrderFlag={OnlineOrderFlag}",
                request.StartDate, request.EndDate, request.TerritoryId, request.SalesPersonId, request.ProductCategoryId, request.OnlineOrderFlag);

            var headers = context.SalesOrderHeaders
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.OrderDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.OrderDate <= request.EndDate.Value)
            .Where(x => !request.TerritoryId.HasValue || x.TerritoryId == request.TerritoryId.Value)
            .Where(x => !request.SalesPersonId.HasValue || x.SalesPersonId == request.SalesPersonId.Value)
            .Where(x => !request.OnlineOrderFlag.HasValue || x.OnlineOrderFlag == request.OnlineOrderFlag.Value);

            // If filtering by category, we need to filter headers first
            if (request.ProductCategoryId.HasValue)
            {
                var orderIdsWithCategory = context.SalesOrderDetails
                    .AsNoTracking()
                    .Join(context.Products.AsNoTracking(), d => d.ProductId, p => p.ProductId, (d, p) => new { d.SalesOrderId, p.ProductSubcategoryId })
                    .Join(context.ProductSubcategories.AsNoTracking(), x => x.ProductSubcategoryId, s => s.ProductSubcategoryId, (x, s) => new { x.SalesOrderId, s.ProductCategoryId })
                    .Where(x => x.ProductCategoryId == request.ProductCategoryId.Value)
                    .Select(x => x.SalesOrderId)
                    .Distinct();

                headers = headers.Where(x => orderIdsWithCategory.Contains(x.SalesOrderId));
            }

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

            // Test with minimal data first
            logger.LogInformation("📊 [Sales Dashboard] Bước 1/13: Đang build Overview...");
            var overview = await BuildOverviewAsync(headers, details, cancellationToken);

            logger.LogInformation("📈 [Sales Dashboard] Bước 2/13: Đang build Revenue Trend...");
            var revenueTrend = await BuildRevenueTrendAsync(headers, cancellationToken);

            logger.LogInformation("👤 [Sales Dashboard] Bước 3/13: Đang build Sales By Person...");
            var salesByPerson = await BuildSalesByPersonAsync(headers, cancellationToken);

            logger.LogInformation("🌍 [Sales Dashboard] Bước 4/13: Đang build Sales By Territory...");
            var salesByTerritory = await BuildSalesByTerritoryAsync(headers, cancellationToken);

            logger.LogInformation("📦 [Sales Dashboard] Bước 5/13: Đang build Category Mix...");
            var categoryMix = await BuildCategoryMixAsync(details, cancellationToken);

            logger.LogInformation("🏆 [Sales Dashboard] Bước 6/13: Đang build Top Products...");
            var topProducts = await BuildTopProductsAsync(details, cancellationToken);

            logger.LogInformation("🛒 [Sales Dashboard] Bước 7/13: Đang build Top Customers...");
            var topCustomers = await BuildTopCustomersAsync(headers, cancellationToken);

            logger.LogInformation("👥 [Sales Dashboard] Bước 8/13: Đang build Customer Segments...");
            var customerSegments = await BuildCustomerSegmentsAsync(headers, cancellationToken);

            logger.LogInformation("📋 [Sales Dashboard] Bước 9/13: Đang build Order Statuses...");
            var orderStatuses = await BuildOrderStatusesAsync(headers, cancellationToken);

            logger.LogInformation("🎯 [Sales Dashboard] Bước 10/13: Đang build Quota...");
            var quota = await BuildQuotaAsync(request, headers, cancellationToken);

            logger.LogInformation("🚚 [Sales Dashboard] Bước 11/13: Đang build Shipping...");
            var shipping = await BuildShippingAsync(headers, cancellationToken);

            logger.LogInformation("💡 [Sales Dashboard] Bước 12/13: Đang build Sales Reasons...");
            var salesReasons = await BuildSalesReasonsAsync(headers, cancellationToken);

            logger.LogInformation("🔧 [Sales Dashboard] Bước 13/13: Đang build Filter Options...");
            var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

            logger.LogInformation("✅ [Sales Dashboard] Hoàn thành tải dữ liệu thành công!");

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
                TopCustomers = topCustomers,
                CustomerSegments = customerSegments,
                OrderStatuses = orderStatuses,
                Quota = quota,
                Shipping = shipping,
                SalesReasons = salesReasons,
                FilterOptions = filterOptions
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "❌ [Sales Dashboard] LỖI khi tải dữ liệu: {ErrorMessage}. StackTrace: {StackTrace}",
                ex.Message, ex.StackTrace);
            throw;
        }
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
        var trendData = await headers
            .GroupBy(x => new { x.OrderDate.Year, x.OrderDate.Month })
            .Select(group => new
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

        // Calculate growth rate: (current month - previous month) / previous month * 100
        var result = new List<RevenueTrendPointDto>();
        for (int i = 0; i < trendData.Count; i++)
        {
            var current = trendData[i];
            decimal? growthRate = null;

            if (i > 0)
            {
                var previous = trendData[i - 1];
                if (previous.Orders > 0)
                {
                    growthRate = ((decimal)(current.Orders - previous.Orders) / previous.Orders) * 100;
                }
            }

            result.Add(new RevenueTrendPointDto
            {
                Period = current.Period,
                Year = current.Year,
                Month = current.Month,
                Revenue = current.Revenue,
                Orders = current.Orders,
                GrowthRate = growthRate
            });
        }

        return result;
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

    private async Task<IReadOnlyList<SalesPerformanceItemDto>> BuildSalesByTerritoryAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var territoryData = await (
            from header in headers
            where header.TerritoryId != null
            join territory in context.SalesTerritories.AsNoTracking() on header.TerritoryId equals territory.TerritoryId
            group new { header, territory } by new { territory.TerritoryId, territory.Name, territory.Group } into grouped
            select new SalesPerformanceItemDto
            {
                Id = grouped.Key.TerritoryId,
                Name = grouped.Key.Name,
                Group = grouped.Key.Group,
                Revenue = grouped.Sum(x => x.header.TotalDue),
                Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);

        return territoryData;
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

    private async Task<IReadOnlyList<CustomerSegmentItemDto>> BuildCustomerSegmentsAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var segments = await (
            from header in headers
            join customer in context.Customers.AsNoTracking() on header.CustomerId equals customer.CustomerId
            group new { header, customer } by (customer.StoreId != null ? "Reseller / B2B" : "Individual / B2C") into grouped
            select new CustomerSegmentItemDto
            {
                Segment = grouped.Key,
                Revenue = grouped.Sum(x => x.header.TotalDue),
                Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count(),
                Customers = grouped.Select(x => x.customer.CustomerId).Distinct().Count()
            })
            .OrderByDescending(x => x.Revenue)
            .ToListAsync(cancellationToken);

        return segments;
    }

    private static async Task<IReadOnlyList<OrderStatusItemDto>> BuildOrderStatusesAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var actualStatuses = await headers
            .GroupBy(x => x.Status)
            .Select(group => new OrderStatusItemDto
            {
                Status = group.Key,
                StatusLabel = group.Key == 1 ? "Đang xử lý"
                    : group.Key == 2 ? "Đã duyệt"
                    : group.Key == 3 ? "Chờ hàng"
                    : group.Key == 4 ? "Từ chối"
                    : group.Key == 5 ? "Đã giao"
                    : group.Key == 6 ? "Đã hủy"
                    : "Không xác định",
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count(),
                Revenue = group.Sum(x => x.TotalDue)
            })
            .ToListAsync(cancellationToken);

        // Ensure all 6 statuses are present (with 0 if not found)
        var allStatuses = new List<OrderStatusItemDto>();
        var statusLabels = new Dictionary<int, string>
        {
            { 1, "Đang xử lý" },
            { 2, "Đã duyệt" },
            { 3, "Chờ hàng" },
            { 4, "Từ chối" },
            { 5, "Đã giao" },
            { 6, "Đã hủy" }
        };

        foreach (var status in statusLabels)
        {
            var existing = actualStatuses.FirstOrDefault(x => x.Status == status.Key);
            if (existing != null)
            {
                allStatuses.Add(new OrderStatusItemDto
                {
                    Status = existing.Status,
                    StatusLabel = $"{status.Value} ({existing.Orders})",
                    Orders = existing.Orders,
                    Revenue = existing.Revenue
                });
            }
            else
            {
                allStatuses.Add(new OrderStatusItemDto
                {
                    Status = status.Key,
                    StatusLabel = $"{status.Value} (0)",
                    Orders = 0,
                    Revenue = 0m
                });
            }
        }

        return allStatuses.OrderBy(x => x.Status).ToList();
    }

    private async Task<QuotaSummaryDto> BuildQuotaAsync(
        GetSalesDashboardQuery request,
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        var actualSales = await headers.SumAsync(x => x.TotalDue, cancellationToken);

        var quotaQuery = from quota in context.SalesPersonQuotaHistories.AsNoTracking()
                         join salesPerson in context.SalesPeople.AsNoTracking() on quota.BusinessEntityId equals salesPerson.BusinessEntityId
                         where (!request.StartDate.HasValue || quota.QuotaDate >= request.StartDate.Value)
                         where (!request.EndDate.HasValue || quota.QuotaDate <= request.EndDate.Value)
                         where (!request.SalesPersonId.HasValue || quota.BusinessEntityId == request.SalesPersonId.Value)
                         where (!request.TerritoryId.HasValue || salesPerson.TerritoryId == request.TerritoryId.Value)
                         select quota.SalesQuota;

        var targetSales = await quotaQuery.SumAsync(x => (decimal?)x, cancellationToken) ?? 0m;

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
        var shippedOrders = await headers
            .Where(x => x.ShipDate != null)
            .Select(x => new
            {
                x.OrderDate,
                ShipDate = x.ShipDate!.Value,
                x.DueDate,
                x.Freight
            })
            .ToListAsync(cancellationToken);

        var totalShippedOrders = shippedOrders.Count;
        var onTimeOrders = shippedOrders.Count(x => x.ShipDate <= x.DueDate);
        var freightTotal = shippedOrders.Sum(x => x.Freight);
        var averageLeadTimeDays = totalShippedOrders == 0
            ? 0d
            : shippedOrders.Average(x => (x.ShipDate - x.OrderDate).TotalDays);

        return new ShippingSummaryDto
        {
            OnTimeRate = totalShippedOrders == 0 ? 0m : (decimal)onTimeOrders / totalShippedOrders,
            AverageLeadTimeDays = averageLeadTimeDays,
            FreightTotal = freightTotal,
            FreightPerOrder = totalShippedOrders == 0 ? 0m : freightTotal / totalShippedOrders
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

    private async Task<IReadOnlyList<TopCustomerItemDto>> BuildTopCustomersAsync(
        IQueryable<Domain.Entities.SalesOrderHeader> headers,
        CancellationToken cancellationToken)
    {
        return await (
                from header in headers
                join customer in context.Customers.AsNoTracking() on header.CustomerId equals customer.CustomerId
                group new { header, customer } by new
                {
                    customer.CustomerId,
                    customer.AccountNumber
                }
                into grouped
                select new TopCustomerItemDto
                {
                    CustomerId = grouped.Key.CustomerId,
                    CustomerName = grouped.Key.AccountNumber ?? $"Customer {grouped.Key.CustomerId}",
                    AccountNumber = grouped.Key.AccountNumber,
                    Revenue = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count(),
                    AverageOrderValue = grouped.Select(x => x.header.SalesOrderId).Distinct().Count() > 0
                        ? grouped.Sum(x => x.header.TotalDue) / grouped.Select(x => x.header.SalesOrderId).Distinct().Count()
                        : 0m
                })
            .OrderByDescending(x => x.Revenue)
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
