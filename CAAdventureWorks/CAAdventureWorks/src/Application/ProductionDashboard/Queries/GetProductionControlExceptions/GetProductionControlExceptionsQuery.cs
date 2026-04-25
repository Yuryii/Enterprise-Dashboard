using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionDashboard;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionControlExceptions;

public sealed record GetProductionControlExceptionsQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? ProductId = null,
    int? ProductCategoryId = null,
    short? LocationId = null,
    short? ScrapReasonId = null,
    bool? MakeOnly = null,
    bool? FinishedGoodsOnly = null,
    bool? OpenOnly = null,
    bool? DelayedOnly = null,
    bool? SafetyStockOnly = null) : IRequest<ProductionControlExceptionsResponseDto>;

public sealed class GetProductionControlExceptionsQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetProductionControlExceptionsQuery, ProductionControlExceptionsResponseDto>
{
    public async Task<ProductionControlExceptionsResponseDto> Handle(GetProductionControlExceptionsQuery request, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;

        var workOrders =
            from workOrder in context.WorkOrders.AsNoTracking()
            join product in context.Products.AsNoTracking() on workOrder.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            join scrapReason in context.ScrapReasons.AsNoTracking() on workOrder.ScrapReasonId equals scrapReason.ScrapReasonId into scrapReasonJoin
            from scrapReason in scrapReasonJoin.DefaultIfEmpty()
            where !request.StartDate.HasValue || workOrder.StartDate >= request.StartDate.Value
            where !request.EndDate.HasValue || workOrder.StartDate <= request.EndDate.Value
            where !request.ProductId.HasValue || workOrder.ProductId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where !request.ScrapReasonId.HasValue || workOrder.ScrapReasonId == request.ScrapReasonId.Value
            where request.MakeOnly != true || product.MakeFlag
            where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
            let isOpen = workOrder.EndDate == null
            let isDelayed = (workOrder.EndDate != null && workOrder.EndDate > workOrder.DueDate)
                || (workOrder.EndDate == null && workOrder.DueDate < today)
            where request.OpenOnly != true || isOpen
            where request.DelayedOnly != true || isDelayed
            select new ProductionControlWorkOrderExceptionRow
            {
                WorkOrderId = workOrder.WorkOrderId,
                ProductId = product.ProductId,
                ProductName = product.Name,
                ProductCategoryId = category != null ? category.ProductCategoryId : 0,
                ProductCategoryName = category != null ? category.Name : "Không phân loại",
                StartDate = workOrder.StartDate,
                EndDate = workOrder.EndDate,
                DueDate = workOrder.DueDate,
                OrderQty = workOrder.OrderQty,
                StockedQty = workOrder.StockedQty,
                ScrappedQty = workOrder.ScrappedQty,
                ScrapReasonId = workOrder.ScrapReasonId,
                ScrapReasonName = scrapReason != null ? scrapReason.Name : null,
                IsOpen = isOpen,
                IsDelayed = isDelayed
            };

        var routingRows =
            from routing in context.WorkOrderRoutings.AsNoTracking()
            join location in context.Locations.AsNoTracking() on routing.LocationId equals location.LocationId
            where !request.LocationId.HasValue || routing.LocationId == request.LocationId.Value
            select new ProductionControlRoutingExceptionRow
            {
                WorkOrderId = routing.WorkOrderId,
                ProductId = routing.ProductId,
                LocationId = routing.LocationId,
                LocationName = location.Name,
                OperationSequence = routing.OperationSequence,
                ScheduledEndDate = routing.ScheduledEndDate,
                ActualEndDate = routing.ActualEndDate,
                PlannedCost = routing.PlannedCost,
                ActualCost = routing.ActualCost ?? 0m,
                ActualResourceHours = routing.ActualResourceHrs ?? 0m
            };

        if (request.LocationId.HasValue)
        {
            workOrders =
                from workOrder in workOrders
                join routing in routingRows on new { workOrder.WorkOrderId, workOrder.ProductId } equals new { routing.WorkOrderId, routing.ProductId }
                select workOrder;
        }

        var inventoryRows = await (
                from inventory in context.ProductInventories.AsNoTracking()
                join product in context.Products.AsNoTracking() on inventory.ProductId equals product.ProductId
                join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
                from subcategory in subcategoryJoin.DefaultIfEmpty()
                join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
                from category in categoryJoin.DefaultIfEmpty()
                where !request.ProductId.HasValue || inventory.ProductId == request.ProductId.Value
                where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
                where request.MakeOnly != true || product.MakeFlag
                where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
                select new
                {
                    product.ProductId,
                    ProductName = product.Name,
                    ProductCategoryId = category != null ? category.ProductCategoryId : 0,
                    ProductCategoryName = category != null ? category.Name : "Không phân loại",
                    Quantity = inventory.Quantity,
                    SafetyStockLevel = (int)product.SafetyStockLevel,
                    ReorderPoint = (int)product.ReorderPoint
                })
            .ToListAsync(cancellationToken);

        var inventoryByProduct = inventoryRows
            .GroupBy(x => new
            {
                x.ProductId,
                x.ProductName,
                x.ProductCategoryId,
                x.ProductCategoryName,
                x.SafetyStockLevel,
                x.ReorderPoint
            })
            .Select(grouped => new ProductionControlSafetyStockExceptionItemDto
            {
                ProductId = grouped.Key.ProductId,
                ProductName = grouped.Key.ProductName,
                ProductCategoryId = grouped.Key.ProductCategoryId,
                ProductCategoryName = grouped.Key.ProductCategoryName,
                InventoryQty = grouped.Sum(x => x.Quantity),
                SafetyStockLevel = grouped.Key.SafetyStockLevel,
                ReorderPoint = grouped.Key.ReorderPoint,
                ShortageQty = grouped.Key.SafetyStockLevel - grouped.Sum(x => x.Quantity)
            })
            .Where(x => request.SafetyStockOnly != true || x.InventoryQty < x.SafetyStockLevel)
            .ToList();

        var openWorkOrders = await BuildOpenWorkOrdersAsync(workOrders, routingRows, cancellationToken);
        var delayedWorkOrders = await BuildDelayedWorkOrdersAsync(workOrders, routingRows, cancellationToken);
        var highScrapWorkOrders = await BuildHighScrapWorkOrdersAsync(workOrders, routingRows, cancellationToken);
        var safetyStockAlerts = BuildSafetyStockAlerts(inventoryByProduct);
        var summary = new ProductionControlExceptionSummaryDto
        {
            OpenWorkOrders = openWorkOrders.Count,
            DelayedWorkOrders = delayedWorkOrders.Count,
            HighScrapWorkOrders = highScrapWorkOrders.Count,
            SafetyStockAlerts = safetyStockAlerts.Count
        };
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new ProductionControlExceptionsResponseDto
        {
            Filters = new ProductionControlExceptionFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                ProductId = request.ProductId,
                ProductCategoryId = request.ProductCategoryId,
                LocationId = request.LocationId,
                ScrapReasonId = request.ScrapReasonId,
                MakeOnly = request.MakeOnly,
                FinishedGoodsOnly = request.FinishedGoodsOnly,
                OpenOnly = request.OpenOnly,
                DelayedOnly = request.DelayedOnly,
                SafetyStockOnly = request.SafetyStockOnly
            },
            Summary = summary,
            FilterOptions = filterOptions,
            OpenWorkOrders = openWorkOrders,
            DelayedWorkOrders = delayedWorkOrders,
            HighScrapWorkOrders = highScrapWorkOrders,
            SafetyStockAlerts = safetyStockAlerts
        };
    }

    private async Task<ProductionDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var products = await context.Products.AsNoTracking()
            .Where(x => x.MakeFlag)
            .OrderBy(x => x.Name)
            .Select(x => new ProductionFilterLookupItemDto(x.ProductId, x.Name))
            .ToListAsync(cancellationToken);

        var productCategories = await context.ProductCategories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ProductionFilterLookupItemDto(x.ProductCategoryId, x.Name))
            .ToListAsync(cancellationToken);

        var locations = await context.Locations.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ProductionLocationFilterLookupItemDto(x.LocationId, x.Name))
            .ToListAsync(cancellationToken);

        var scrapReasons = await context.ScrapReasons.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ProductionFilterLookupItemDto(x.ScrapReasonId, x.Name))
            .ToListAsync(cancellationToken);

        return new ProductionDashboardFilterOptionsDto
        {
            Products = products,
            ProductCategories = productCategories,
            Locations = locations,
            ScrapReasons = scrapReasons
        };
    }

    private static async Task<IReadOnlyList<ProductionControlWorkOrderExceptionItemDto>> BuildOpenWorkOrdersAsync(
        IQueryable<ProductionControlWorkOrderExceptionRow> workOrders,
        IQueryable<ProductionControlRoutingExceptionRow> routingRows,
        CancellationToken cancellationToken)
    {
        var openWorkOrders = await workOrders
            .Where(x => x.IsOpen)
            .ToListAsync(cancellationToken);

        var routingList = await routingRows.ToListAsync(cancellationToken);
        var routingLookup = routingList.ToLookup(x => (x.WorkOrderId, x.ProductId));
        var today = DateTime.UtcNow.Date;

        return openWorkOrders
            .Select(workOrder =>
            {
                var relatedRouting = routingLookup[(workOrder.WorkOrderId, workOrder.ProductId)];
                var locationNames = string.Join(", ", relatedRouting.Select(x => x.LocationName).Distinct().OrderBy(x => x));
                var latestScheduledEndDate = relatedRouting.Select(x => (DateTime?)x.ScheduledEndDate).DefaultIfEmpty().Max();

                return new ProductionControlWorkOrderExceptionItemDto
                {
                    WorkOrderId = workOrder.WorkOrderId,
                    ProductId = workOrder.ProductId,
                    ProductName = workOrder.ProductName,
                    ProductCategoryName = workOrder.ProductCategoryName,
                    StartDate = workOrder.StartDate,
                    DueDate = workOrder.DueDate,
                    EndDate = workOrder.EndDate,
                    OrderQty = workOrder.OrderQty,
                    StockedQty = workOrder.StockedQty,
                    ScrappedQty = workOrder.ScrappedQty,
                    CompletionRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.StockedQty / workOrder.OrderQty,
                    ScrapRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.ScrappedQty / workOrder.OrderQty,
                    IsOpen = true,
                    IsDelayed = workOrder.IsDelayed,
                    LocationNames = locationNames,
                    LatestScheduledEndDate = latestScheduledEndDate,
                    DelayDays = workOrder.DueDate < today ? (today - workOrder.DueDate).Days : 0,
                    ScrapReasonName = workOrder.ScrapReasonName
                };
            })
            .OrderByDescending(x => x.DelayDays)
            .ThenBy(x => x.DueDate)
            .ThenBy(x => x.ProductName)
            .Take(20)
            .ToList();
    }

    private static async Task<IReadOnlyList<ProductionControlWorkOrderExceptionItemDto>> BuildDelayedWorkOrdersAsync(
        IQueryable<ProductionControlWorkOrderExceptionRow> workOrders,
        IQueryable<ProductionControlRoutingExceptionRow> routingRows,
        CancellationToken cancellationToken)
    {
        var delayedWorkOrders = await workOrders
            .Where(x => x.IsDelayed)
            .ToListAsync(cancellationToken);

        var routingList = await routingRows.ToListAsync(cancellationToken);
        var routingLookup = routingList.ToLookup(x => (x.WorkOrderId, x.ProductId));
        var today = DateTime.UtcNow.Date;

        return delayedWorkOrders
            .Select(workOrder =>
            {
                var relatedRouting = routingLookup[(workOrder.WorkOrderId, workOrder.ProductId)];
                var locationNames = string.Join(", ", relatedRouting.Select(x => x.LocationName).Distinct().OrderBy(x => x));
                var latestScheduledEndDate = relatedRouting.Select(x => (DateTime?)x.ScheduledEndDate).DefaultIfEmpty().Max();

                return new ProductionControlWorkOrderExceptionItemDto
                {
                    WorkOrderId = workOrder.WorkOrderId,
                    ProductId = workOrder.ProductId,
                    ProductName = workOrder.ProductName,
                    ProductCategoryName = workOrder.ProductCategoryName,
                    StartDate = workOrder.StartDate,
                    DueDate = workOrder.DueDate,
                    EndDate = workOrder.EndDate,
                    OrderQty = workOrder.OrderQty,
                    StockedQty = workOrder.StockedQty,
                    ScrappedQty = workOrder.ScrappedQty,
                    CompletionRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.StockedQty / workOrder.OrderQty,
                    ScrapRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.ScrappedQty / workOrder.OrderQty,
                    IsOpen = workOrder.IsOpen,
                    IsDelayed = true,
                    LocationNames = locationNames,
                    LatestScheduledEndDate = latestScheduledEndDate,
                    DelayDays = ((workOrder.EndDate ?? today) - workOrder.DueDate).Days,
                    ScrapReasonName = workOrder.ScrapReasonName
                };
            })
            .OrderByDescending(x => x.DelayDays)
            .ThenBy(x => x.DueDate)
            .ThenBy(x => x.ProductName)
            .Take(20)
            .ToList();
    }

    private static async Task<IReadOnlyList<ProductionControlWorkOrderExceptionItemDto>> BuildHighScrapWorkOrdersAsync(
        IQueryable<ProductionControlWorkOrderExceptionRow> workOrders,
        IQueryable<ProductionControlRoutingExceptionRow> routingRows,
        CancellationToken cancellationToken)
    {
        var highScrapWorkOrders = await workOrders
            .Where(x => x.ScrappedQty > 0)
            .ToListAsync(cancellationToken);

        var routingList = await routingRows.ToListAsync(cancellationToken);
        var routingLookup = routingList.ToLookup(x => (x.WorkOrderId, x.ProductId));
        var today = DateTime.UtcNow.Date;

        return highScrapWorkOrders
            .Select(workOrder =>
            {
                var relatedRouting = routingLookup[(workOrder.WorkOrderId, workOrder.ProductId)];
                var locationNames = string.Join(", ", relatedRouting.Select(x => x.LocationName).Distinct().OrderBy(x => x));
                var latestScheduledEndDate = relatedRouting.Select(x => (DateTime?)x.ScheduledEndDate).DefaultIfEmpty().Max();
                var totalActualCost = relatedRouting.Sum(x => x.ActualCost);
                var totalPlannedCost = relatedRouting.Sum(x => x.PlannedCost);

                return new ProductionControlWorkOrderExceptionItemDto
                {
                    WorkOrderId = workOrder.WorkOrderId,
                    ProductId = workOrder.ProductId,
                    ProductName = workOrder.ProductName,
                    ProductCategoryName = workOrder.ProductCategoryName,
                    StartDate = workOrder.StartDate,
                    DueDate = workOrder.DueDate,
                    EndDate = workOrder.EndDate,
                    OrderQty = workOrder.OrderQty,
                    StockedQty = workOrder.StockedQty,
                    ScrappedQty = workOrder.ScrappedQty,
                    CompletionRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.StockedQty / workOrder.OrderQty,
                    ScrapRate = workOrder.OrderQty == 0 ? 0m : (decimal)workOrder.ScrappedQty / workOrder.OrderQty,
                    IsOpen = workOrder.IsOpen,
                    IsDelayed = workOrder.IsDelayed,
                    LocationNames = locationNames,
                    LatestScheduledEndDate = latestScheduledEndDate,
                    DelayDays = workOrder.DueDate < today && !workOrder.EndDate.HasValue
                        ? (today - workOrder.DueDate).Days
                        : workOrder.EndDate.HasValue && workOrder.EndDate > workOrder.DueDate
                            ? (workOrder.EndDate.GetValueOrDefault() - workOrder.DueDate).Days
                            : 0,
                    ScrapReasonName = workOrder.ScrapReasonName,
                    TotalActualCost = totalActualCost,
                    TotalPlannedCost = totalPlannedCost,
                    CostVariance = totalActualCost - totalPlannedCost
                };
            })
            .OrderByDescending(x => x.ScrapRate)
            .ThenByDescending(x => x.ScrappedQty)
            .ThenBy(x => x.ProductName)
            .Take(20)
            .ToList();
    }

    private static IReadOnlyList<ProductionControlSafetyStockExceptionItemDto> BuildSafetyStockAlerts(
        IReadOnlyList<ProductionControlSafetyStockExceptionItemDto> inventoryByProduct)
    {
        return inventoryByProduct
            .Where(x => x.InventoryQty < x.SafetyStockLevel)
            .OrderByDescending(x => x.ShortageQty)
            .ThenBy(x => x.ProductName)
            .Take(20)
            .ToList();
    }
}

public sealed class ProductionControlExceptionsResponseDto
{
    public ProductionControlExceptionFilterDto Filters { get; init; } = new();

    public ProductionControlExceptionSummaryDto Summary { get; init; } = new();

    public ProductionDashboardFilterOptionsDto FilterOptions { get; init; } = new();

    public IReadOnlyList<ProductionControlWorkOrderExceptionItemDto> OpenWorkOrders { get; init; } = [];

    public IReadOnlyList<ProductionControlWorkOrderExceptionItemDto> DelayedWorkOrders { get; init; } = [];

    public IReadOnlyList<ProductionControlWorkOrderExceptionItemDto> HighScrapWorkOrders { get; init; } = [];

    public IReadOnlyList<ProductionControlSafetyStockExceptionItemDto> SafetyStockAlerts { get; init; } = [];
}

public sealed class ProductionControlExceptionFilterDto
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

public sealed class ProductionControlExceptionSummaryDto
{
    public int OpenWorkOrders { get; init; }

    public int DelayedWorkOrders { get; init; }

    public int HighScrapWorkOrders { get; init; }

    public int SafetyStockAlerts { get; init; }
}

public sealed class ProductionControlWorkOrderExceptionItemDto
{
    public int WorkOrderId { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string ProductCategoryName { get; init; } = string.Empty;

    public DateTime StartDate { get; init; }

    public DateTime DueDate { get; init; }

    public DateTime? EndDate { get; init; }

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public int ScrappedQty { get; init; }

    public decimal CompletionRate { get; init; }

    public decimal ScrapRate { get; init; }

    public bool IsOpen { get; init; }

    public bool IsDelayed { get; init; }

    public string LocationNames { get; init; } = string.Empty;

    public DateTime? LatestScheduledEndDate { get; init; }

    public int DelayDays { get; init; }

    public string? ScrapReasonName { get; init; }

    public decimal TotalPlannedCost { get; init; }

    public decimal TotalActualCost { get; init; }

    public decimal CostVariance { get; init; }
}

public sealed class ProductionControlSafetyStockExceptionItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public int InventoryQty { get; init; }

    public int SafetyStockLevel { get; init; }

    public int ReorderPoint { get; init; }

    public int ShortageQty { get; init; }
}

internal sealed class ProductionControlWorkOrderExceptionRow
{
    public int WorkOrderId { get; init; }

    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public int ProductCategoryId { get; init; }

    public string ProductCategoryName { get; init; } = string.Empty;

    public DateTime StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public DateTime DueDate { get; init; }

    public int OrderQty { get; init; }

    public int StockedQty { get; init; }

    public short ScrappedQty { get; init; }

    public short? ScrapReasonId { get; init; }

    public string? ScrapReasonName { get; init; }

    public bool IsOpen { get; init; }

    public bool IsDelayed { get; init; }
}

internal sealed class ProductionControlRoutingExceptionRow
{
    public int WorkOrderId { get; init; }

    public int ProductId { get; init; }

    public short LocationId { get; init; }

    public string LocationName { get; init; } = string.Empty;

    public short OperationSequence { get; init; }

    public DateTime ScheduledEndDate { get; init; }

    public DateTime? ActualEndDate { get; init; }

    public decimal PlannedCost { get; init; }

    public decimal ActualCost { get; init; }

    public decimal ActualResourceHours { get; init; }
}
