using CAAdventureWorks.Application.Common.Interfaces;

namespace CAAdventureWorks.Application.QualityAssuranceDashboard.Queries.GetQualityAssuranceDashboard;

public sealed record GetQualityAssuranceDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    short? ScrapReasonId = null,
    int? ProductCategoryId = null,
    short? LocationId = null,
    int? VendorId = null,
    bool? CurrentInspectorsOnly = null) : IRequest<QualityAssuranceDashboardResponseDto>;

public sealed class GetQualityAssuranceDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetQualityAssuranceDashboardQuery, QualityAssuranceDashboardResponseDto>
{
    private const string QualityAssuranceDepartmentName = "Quality Assurance";

    public async Task<QualityAssuranceDashboardResponseDto> Handle(GetQualityAssuranceDashboardQuery request, CancellationToken cancellationToken)
    {
        var workOrders =
            from workOrder in context.WorkOrders.AsNoTracking()
            join product in context.Products.AsNoTracking() on workOrder.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId
            join scrapReason in context.ScrapReasons.AsNoTracking() on workOrder.ScrapReasonId equals scrapReason.ScrapReasonId into scrapReasonJoin
            from scrapReason in scrapReasonJoin.DefaultIfEmpty()
            where !request.StartDate.HasValue || workOrder.StartDate >= request.StartDate.Value
            where !request.EndDate.HasValue || workOrder.StartDate <= request.EndDate.Value
            where !request.ScrapReasonId.HasValue || workOrder.ScrapReasonId == request.ScrapReasonId.Value
            where !request.ProductCategoryId.HasValue || category.ProductCategoryId == request.ProductCategoryId.Value
            select new QualityWorkOrderRow
            {
                WorkOrderId = workOrder.WorkOrderId,
                StartDate = workOrder.StartDate,
                ProductId = product.ProductId,
                ProductName = product.Name,
                ProductCategoryId = category.ProductCategoryId,
                ProductCategoryName = category.Name,
                OrderQty = workOrder.OrderQty,
                StockedQty = workOrder.StockedQty,
                ScrappedQty = workOrder.ScrappedQty,
                ScrapReasonId = workOrder.ScrapReasonId,
                ScrapReasonName = scrapReason != null ? scrapReason.Name : "Không xác định"
            };

        var routingRows =
            from routing in context.WorkOrderRoutings.AsNoTracking()
            join location in context.Locations.AsNoTracking() on routing.LocationId equals location.LocationId
            where !request.LocationId.HasValue || routing.LocationId == request.LocationId.Value
            select new QualityRoutingRow
            {
                WorkOrderId = routing.WorkOrderId,
                LocationId = routing.LocationId,
                LocationName = location.Name,
                PlannedCost = routing.PlannedCost,
                ActualCost = routing.ActualCost ?? 0m,
                ActualResourceHours = routing.ActualResourceHrs ?? 0m
            };

        if (request.LocationId.HasValue)
        {
            workOrders =
                from workOrder in workOrders
                join routing in routingRows on workOrder.WorkOrderId equals routing.WorkOrderId
                select workOrder;
        }

        var vendorDetails =
            from header in context.PurchaseOrderHeaders.AsNoTracking()
            join detail in context.PurchaseOrderDetails.AsNoTracking() on header.PurchaseOrderId equals detail.PurchaseOrderId
            join vendor in context.Vendors.AsNoTracking() on header.VendorId equals vendor.BusinessEntityId
            where !request.StartDate.HasValue || header.OrderDate >= request.StartDate.Value
            where !request.EndDate.HasValue || header.OrderDate <= request.EndDate.Value
            where !request.VendorId.HasValue || header.VendorId == request.VendorId.Value
            select new QualityVendorDetailRow
            {
                VendorId = vendor.BusinessEntityId,
                VendorName = vendor.Name,
                ReceivedQty = detail.ReceivedQty,
                RejectedQty = detail.RejectedQty
            };

        var inspectorRows =
            from history in context.EmployeeDepartmentHistories.AsNoTracking()
            join department in context.Departments.AsNoTracking() on history.DepartmentId equals department.DepartmentId
            join employee in context.Employees.AsNoTracking() on history.BusinessEntityId equals employee.BusinessEntityId
            where department.Name == QualityAssuranceDepartmentName
            where request.CurrentInspectorsOnly != true || history.EndDate == null
            where request.CurrentInspectorsOnly != true || employee.CurrentFlag
            select new QualityDepartmentRow
            {
                BusinessEntityId = history.BusinessEntityId,
                DepartmentId = history.DepartmentId,
                DepartmentName = department.Name,
                GroupName = department.GroupName
            };

        var overview = await BuildOverviewAsync(workOrders, vendorDetails, inspectorRows, cancellationToken);
        var defectTrend = await BuildDefectTrendAsync(workOrders, cancellationToken);
        var topScrapReasons = await BuildTopScrapReasonsAsync(workOrders, cancellationToken);
        var topDefectProducts = await BuildTopDefectProductsAsync(workOrders, cancellationToken);
        var defectsByCategory = await BuildDefectsByCategoryAsync(workOrders, cancellationToken);
        var defectsByLocation = await BuildDefectsByLocationAsync(workOrders, routingRows, cancellationToken);
        var vendorRejectRates = await BuildVendorRejectRatesAsync(vendorDetails, cancellationToken);
        var inspectorHeadcount = await BuildInspectorHeadcountAsync(inspectorRows, cancellationToken);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new QualityAssuranceDashboardResponseDto
        {
            Filters = new QualityAssuranceDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ScrapReasonId = request.ScrapReasonId,
                ProductCategoryId = request.ProductCategoryId,
                LocationId = request.LocationId,
                VendorId = request.VendorId,
                CurrentInspectorsOnly = request.CurrentInspectorsOnly
            },
            Overview = overview,
            DefectTrend = defectTrend,
            TopScrapReasons = topScrapReasons,
            TopDefectProducts = topDefectProducts,
            DefectsByCategory = defectsByCategory,
            DefectsByLocation = defectsByLocation,
            VendorRejectRates = vendorRejectRates,
            InspectorHeadcount = inspectorHeadcount,
            FilterOptions = filterOptions
        };
    }

    private static async Task<QualityAssuranceOverviewDto> BuildOverviewAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        IQueryable<QualityVendorDetailRow> vendorDetails,
        IQueryable<QualityDepartmentRow> inspectorRows,
        CancellationToken cancellationToken)
    {
        var workOrderAggregate = await workOrders
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalWorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                TotalOrderQty = group.Sum(x => x.OrderQty),
                TotalScrappedQty = group.Sum(x => x.ScrappedQty),
                TotalStockedQty = group.Sum(x => x.StockedQty),
                OrdersWithDefects = group.Count(x => x.ScrappedQty > 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var vendorAggregate = await vendorDetails
            .GroupBy(_ => 1)
            .Select(group => new
            {
                ReceivedQty = group.Sum(x => x.ReceivedQty),
                RejectedQty = group.Sum(x => x.RejectedQty)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var activeInspectors = await inspectorRows
            .Select(x => x.BusinessEntityId)
            .Distinct()
            .CountAsync(cancellationToken);

        var totalOrderQty = workOrderAggregate?.TotalOrderQty ?? 0;
        var totalReceivedQty = vendorAggregate?.ReceivedQty ?? 0m;

        return new QualityAssuranceOverviewDto
        {
            TotalWorkOrders = workOrderAggregate?.TotalWorkOrders ?? 0,
            TotalOrderQty = totalOrderQty,
            TotalScrappedQty = workOrderAggregate?.TotalScrappedQty ?? 0,
            ScrapRate = totalOrderQty == 0 ? 0m : (decimal)(workOrderAggregate?.TotalScrappedQty ?? 0) / totalOrderQty,
            CompletionRate = totalOrderQty == 0 ? 0m : (decimal)(workOrderAggregate?.TotalStockedQty ?? 0) / totalOrderQty,
            OrdersWithDefects = workOrderAggregate?.OrdersWithDefects ?? 0,
            ActiveInspectors = activeInspectors,
            VendorRejectRate = totalReceivedQty == 0m ? 0m : (vendorAggregate?.RejectedQty ?? 0m) / totalReceivedQty
        };
    }

    private static async Task<IReadOnlyList<QualityTrendPointDto>> BuildDefectTrendAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.StartDate.Year, x.StartDate.Month })
            .Select(group => new QualityTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0
                    ? 0m
                    : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityScrapReasonItemDto>> BuildTopScrapReasonsAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .Where(x => x.ScrappedQty > 0)
            .GroupBy(x => new { x.ScrapReasonId, x.ScrapReasonName })
            .Select(group => new QualityScrapReasonItemDto
            {
                ScrapReasonId = group.Key.ScrapReasonId ?? 0,
                ScrapReasonName = group.Key.ScrapReasonName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                ScrappedQty = group.Sum(x => x.ScrappedQty)
            })
            .OrderByDescending(x => x.ScrappedQty)
            .ThenBy(x => x.ScrapReasonName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityProductItemDto>> BuildTopDefectProductsAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .Where(x => x.ScrappedQty > 0)
            .GroupBy(x => new { x.ProductId, x.ProductName, x.ProductCategoryName })
            .Select(group => new QualityProductItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                ProductCategoryName = group.Key.ProductCategoryName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0
                    ? 0m
                    : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.ScrappedQty)
            .ThenBy(x => x.ProductName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityCategoryItemDto>> BuildDefectsByCategoryAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.ProductCategoryId, x.ProductCategoryName })
            .Select(group => new QualityCategoryItemDto
            {
                ProductCategoryId = group.Key.ProductCategoryId,
                ProductCategoryName = group.Key.ProductCategoryName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0
                    ? 0m
                    : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.ScrappedQty)
            .ThenBy(x => x.ProductCategoryName)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityLocationItemDto>> BuildDefectsByLocationAsync(
        IQueryable<QualityWorkOrderRow> workOrders,
        IQueryable<QualityRoutingRow> routingRows,
        CancellationToken cancellationToken)
    {
        return await (
                from routing in routingRows
                join workOrder in workOrders on routing.WorkOrderId equals workOrder.WorkOrderId
                group new { routing, workOrder } by new { routing.LocationId, routing.LocationName } into grouped
                select new QualityLocationItemDto
                {
                    LocationId = grouped.Key.LocationId,
                    LocationName = grouped.Key.LocationName,
                    PlannedCost = grouped.Sum(x => x.routing.PlannedCost),
                    ActualCost = grouped.Sum(x => x.routing.ActualCost),
                    ActualResourceHours = grouped.Sum(x => x.routing.ActualResourceHours),
                    WorkOrders = grouped.Select(x => x.workOrder.WorkOrderId).Distinct().Count()
                })
            .OrderByDescending(x => x.ActualCost)
            .ThenBy(x => x.LocationName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityVendorItemDto>> BuildVendorRejectRatesAsync(
        IQueryable<QualityVendorDetailRow> vendorDetails,
        CancellationToken cancellationToken)
    {
        return await vendorDetails
            .GroupBy(x => new { x.VendorId, x.VendorName })
            .Select(group => new QualityVendorItemDto
            {
                VendorId = group.Key.VendorId,
                VendorName = group.Key.VendorName,
                ReceivedQty = group.Sum(x => x.ReceivedQty),
                RejectedQty = group.Sum(x => x.RejectedQty),
                RejectRate = group.Sum(x => x.ReceivedQty) == 0m
                    ? 0m
                    : group.Sum(x => x.RejectedQty) / group.Sum(x => x.ReceivedQty)
            })
            .OrderByDescending(x => x.RejectRate)
            .ThenByDescending(x => x.RejectedQty)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<QualityDepartmentItemDto>> BuildInspectorHeadcountAsync(
        IQueryable<QualityDepartmentRow> inspectorRows,
        CancellationToken cancellationToken)
    {
        return await inspectorRows
            .GroupBy(x => new { x.DepartmentId, x.DepartmentName, x.GroupName })
            .Select(group => new QualityDepartmentItemDto
            {
                DepartmentId = group.Key.DepartmentId,
                DepartmentName = group.Key.DepartmentName,
                GroupName = group.Key.GroupName,
                Headcount = group.Select(x => x.BusinessEntityId).Distinct().Count()
            })
            .OrderByDescending(x => x.Headcount)
            .ThenBy(x => x.DepartmentName)
            .ToListAsync(cancellationToken);
    }

    private async Task<QualityAssuranceDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var scrapReasons = await context.ScrapReasons.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new QualityFilterLookupItemDto(x.ScrapReasonId, x.Name))
            .ToListAsync(cancellationToken);

        var productCategories = await context.ProductCategories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new QualityFilterLookupItemDto(x.ProductCategoryId, x.Name))
            .ToListAsync(cancellationToken);

        var locations = await context.Locations.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new QualityLocationFilterLookupItemDto(x.LocationId, x.Name))
            .ToListAsync(cancellationToken);

        var vendors = await context.Vendors.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new QualityFilterLookupItemDto(x.BusinessEntityId, x.Name))
            .ToListAsync(cancellationToken);

        return new QualityAssuranceDashboardFilterOptionsDto
        {
            ScrapReasons = scrapReasons,
            ProductCategories = productCategories,
            Locations = locations,
            Vendors = vendors
        };
    }
}
