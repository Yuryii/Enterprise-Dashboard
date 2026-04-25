using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionDashboard;

public sealed record GetProductionDashboardQuery(
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
    bool? SafetyStockOnly = null) : IRequest<ProductionDashboardResponseDto>;

public sealed class GetProductionDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetProductionDashboardQuery, ProductionDashboardResponseDto>
{
    public async Task<ProductionDashboardResponseDto> Handle(GetProductionDashboardQuery request, CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;

        var workOrders =
            from workOrder in context.WorkOrders.AsNoTracking()
            join product in context.Products.AsNoTracking() on workOrder.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
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
            select new ProductionWorkOrderRow
            {
                WorkOrderId = workOrder.WorkOrderId,
                StartDate = workOrder.StartDate,
                EndDate = workOrder.EndDate,
                DueDate = workOrder.DueDate,
                ProductId = product.ProductId,
                ProductName = product.Name,
                MakeFlag = product.MakeFlag,
                FinishedGoodsFlag = product.FinishedGoodsFlag,
                ProductCategoryId = category != null ? category.ProductCategoryId : 0,
                ProductCategoryName = category != null ? category.Name : "Không phân loại",
                OrderQty = workOrder.OrderQty,
                StockedQty = workOrder.StockedQty,
                ScrappedQty = workOrder.ScrappedQty,
                SafetyStockLevel = product.SafetyStockLevel,
                ReorderPoint = product.ReorderPoint,
                ScrapReasonId = workOrder.ScrapReasonId,
                IsOpen = isOpen,
                IsDelayed = isDelayed
            };

        var routingRows =
            from routing in context.WorkOrderRoutings.AsNoTracking()
            join location in context.Locations.AsNoTracking() on routing.LocationId equals location.LocationId
            where !request.LocationId.HasValue || routing.LocationId == request.LocationId.Value
            select new ProductionRoutingRow
            {
                WorkOrderId = routing.WorkOrderId,
                ProductId = routing.ProductId,
                OperationSequence = routing.OperationSequence,
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
                join routing in routingRows on new { workOrder.WorkOrderId, workOrder.ProductId } equals new { routing.WorkOrderId, routing.ProductId }
                select workOrder;
        }

        var inventoryRows =
            from inventory in context.ProductInventories.AsNoTracking()
            join product in context.Products.AsNoTracking() on inventory.ProductId equals product.ProductId
            join location in context.Locations.AsNoTracking() on inventory.LocationId equals location.LocationId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            where !request.ProductId.HasValue || inventory.ProductId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where !request.LocationId.HasValue || inventory.LocationId == request.LocationId.Value
            where request.MakeOnly != true || product.MakeFlag
            where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
            select new ProductionInventoryRow
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                LocationId = location.LocationId,
                LocationName = location.Name,
                Quantity = inventory.Quantity,
                SafetyStockLevel = product.SafetyStockLevel,
                ReorderPoint = product.ReorderPoint
            };

        var inventoryByProduct =
            from inventory in inventoryRows
            group inventory by new { inventory.ProductId, inventory.ProductName, inventory.SafetyStockLevel, inventory.ReorderPoint } into grouped
            select new ProductionSafetyStockItemDto
            {
                ProductId = grouped.Key.ProductId,
                ProductName = grouped.Key.ProductName,
                InventoryQty = grouped.Sum(x => x.Quantity),
                SafetyStockLevel = grouped.Key.SafetyStockLevel,
                ReorderPoint = grouped.Key.ReorderPoint,
                ShortageQty = grouped.Key.SafetyStockLevel - grouped.Sum(x => x.Quantity)
            };

        if (request.SafetyStockOnly == true)
        {
            inventoryRows =
                from inventory in inventoryRows
                join alert in inventoryByProduct.Where(x => x.InventoryQty < x.SafetyStockLevel)
                    on inventory.ProductId equals alert.ProductId
                select inventory;

            var lowStockProductIds = inventoryRows.Select(x => x.ProductId).Distinct();
            workOrders = workOrders.Where(x => lowStockProductIds.Contains(x.ProductId));
        }

        var costHistoryRows =
            from history in context.ProductCostHistories.AsNoTracking()
            join product in context.Products.AsNoTracking() on history.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            where !request.ProductId.HasValue || history.ProductId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where request.MakeOnly != true || product.MakeFlag
            where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
            select new ProductionCostHistoryRow
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                StartDate = history.StartDate,
                EndDate = history.EndDate,
                StandardCost = history.StandardCost
            };

        var bomRows =
            from bom in context.BillOfMaterials.AsNoTracking()
            join assembly in context.Products.AsNoTracking() on bom.ProductAssemblyId equals assembly.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on assembly.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            where !request.ProductId.HasValue || bom.ProductAssemblyId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where request.MakeOnly != true || assembly.MakeFlag
            where request.FinishedGoodsOnly != true || assembly.FinishedGoodsFlag
            select new ProductionBomRow
            {
                ProductAssemblyId = assembly.ProductId,
                AssemblyName = assembly.Name,
                ComponentId = bom.ComponentId,
                BomLevel = bom.Bomlevel,
                PerAssemblyQty = bom.PerAssemblyQty
            };

        var transactionRows =
            from transaction in context.TransactionHistories.AsNoTracking()
            join product in context.Products.AsNoTracking() on transaction.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            where transaction.TransactionType == "W"
            where !request.StartDate.HasValue || transaction.TransactionDate >= request.StartDate.Value
            where !request.EndDate.HasValue || transaction.TransactionDate <= request.EndDate.Value
            where !request.ProductId.HasValue || transaction.ProductId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where request.MakeOnly != true || product.MakeFlag
            where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
            select new ProductionTransactionRow
            {
                TransactionDate = transaction.TransactionDate,
                ProductId = transaction.ProductId,
                Quantity = transaction.Quantity,
                ActualCost = transaction.ActualCost
            };

        var overview = await BuildOverviewAsync(workOrders, routingRows, inventoryByProduct, transactionRows, cancellationToken);
        var workOrderTrend = await BuildWorkOrderTrendAsync(workOrders, cancellationToken);
        var outputTrend = await BuildOutputTrendAsync(workOrders, cancellationToken);
        var topProducts = await BuildTopProductsAsync(workOrders, cancellationToken);
        var topScrapProducts = await BuildTopScrapProductsAsync(workOrders, cancellationToken);
        var categories = await BuildCategoriesAsync(workOrders, cancellationToken);
        var locationCosts = await BuildLocationCostsAsync(workOrders, routingRows, cancellationToken);
        var operationVariances = await BuildOperationVariancesAsync(routingRows, cancellationToken);
        var locationHours = await BuildLocationHoursAsync(routingRows, cancellationToken);
        var delayedWorkOrders = await BuildDelayedWorkOrdersAsync(workOrders, routingRows, cancellationToken);
        var inventoryByLocation = await BuildInventoryByLocationAsync(inventoryRows, cancellationToken);
        var safetyStockAlerts = await BuildSafetyStockAlertsAsync(inventoryByProduct, cancellationToken);
        var costHistory = await BuildCostHistoryAsync(costHistoryRows, cancellationToken);
        var bomSummaries = await BuildBomSummariesAsync(bomRows, cancellationToken);
        var transactionTrend = await BuildTransactionTrendAsync(transactionRows, cancellationToken);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new ProductionDashboardResponseDto
        {
            Filters = new ProductionDashboardAppliedFilterDto
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
            Overview = overview,
            WorkOrderTrend = workOrderTrend,
            OutputTrend = outputTrend,
            TopProducts = topProducts,
            TopScrapProducts = topScrapProducts,
            Categories = categories,
            LocationCosts = locationCosts,
            OperationVariances = operationVariances,
            LocationHours = locationHours,
            DelayedWorkOrders = delayedWorkOrders,
            InventoryByLocation = inventoryByLocation,
            SafetyStockAlerts = safetyStockAlerts,
            CostHistory = costHistory,
            BomSummaries = bomSummaries,
            TransactionTrend = transactionTrend,
            FilterOptions = filterOptions
        };
    }

    private static async Task<ProductionOverviewDto> BuildOverviewAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        IQueryable<ProductionRoutingRow> routingRows,
        IQueryable<ProductionSafetyStockItemDto> inventoryByProduct,
        IQueryable<ProductionTransactionRow> transactionRows,
        CancellationToken cancellationToken)
    {
        var workOrderAggregate = await workOrders
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalWorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                TotalOrderQty = group.Sum(x => x.OrderQty),
                TotalStockedQty = group.Sum(x => x.StockedQty),
                TotalScrappedQty = group.Sum(x => x.ScrappedQty),
                OpenWorkOrders = group.Count(x => x.IsOpen),
                DelayedWorkOrders = group.Count(x => x.IsDelayed)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var routingAggregate = await (
                from routing in routingRows
                join workOrder in workOrders on new { routing.WorkOrderId, routing.ProductId } equals new { workOrder.WorkOrderId, workOrder.ProductId }
                group routing by 1 into grouped
                select new
                {
                    PlannedCost = grouped.Sum(x => x.PlannedCost),
                    ActualCost = grouped.Sum(x => x.ActualCost),
                    ActualResourceHours = grouped.Sum(x => x.ActualResourceHours)
                })
            .FirstOrDefaultAsync(cancellationToken);

        var inventoryAggregate = await inventoryByProduct
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalInventoryQty = group.Sum(x => x.InventoryQty),
                SafetyStockAlerts = group.Count(x => x.InventoryQty < x.SafetyStockLevel)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var transactionAggregate = await transactionRows
            .GroupBy(_ => 1)
            .Select(group => new
            {
                ProductionTransactionCost = group.Sum(x => x.ActualCost)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalOrderQty = workOrderAggregate?.TotalOrderQty ?? 0;

        return new ProductionOverviewDto
        {
            TotalWorkOrders = workOrderAggregate?.TotalWorkOrders ?? 0,
            TotalOrderQty = totalOrderQty,
            TotalStockedQty = workOrderAggregate?.TotalStockedQty ?? 0,
            TotalScrappedQty = workOrderAggregate?.TotalScrappedQty ?? 0,
            CompletionRate = totalOrderQty == 0 ? 0m : (decimal)(workOrderAggregate?.TotalStockedQty ?? 0) / totalOrderQty,
            ScrapRate = totalOrderQty == 0 ? 0m : (decimal)(workOrderAggregate?.TotalScrappedQty ?? 0) / totalOrderQty,
            OpenWorkOrders = workOrderAggregate?.OpenWorkOrders ?? 0,
            DelayedWorkOrders = workOrderAggregate?.DelayedWorkOrders ?? 0,
            PlannedCost = routingAggregate?.PlannedCost ?? 0m,
            ActualCost = routingAggregate?.ActualCost ?? 0m,
            CostVariance = (routingAggregate?.ActualCost ?? 0m) - (routingAggregate?.PlannedCost ?? 0m),
            ActualResourceHours = routingAggregate?.ActualResourceHours ?? 0m,
            TotalInventoryQty = inventoryAggregate?.TotalInventoryQty ?? 0,
            SafetyStockAlerts = inventoryAggregate?.SafetyStockAlerts ?? 0,
            ProductionTransactionCost = transactionAggregate?.ProductionTransactionCost ?? 0m
        };
    }

    private static async Task<IReadOnlyList<ProductionTrendPointDto>> BuildWorkOrderTrendAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.StartDate.Year, x.StartDate.Month })
            .Select(group => new ProductionTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                OpenWorkOrders = group.Count(x => x.IsOpen),
                DelayedWorkOrders = group.Count(x => x.IsDelayed)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionOutputTrendPointDto>> BuildOutputTrendAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.StartDate.Year, x.StartDate.Month })
            .Select(group => new ProductionOutputTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                OrderQty = group.Sum(x => x.OrderQty),
                StockedQty = group.Sum(x => x.StockedQty),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                CompletionRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.StockedQty) / group.Sum(x => x.OrderQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionProductItemDto>> BuildTopProductsAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.ProductId, x.ProductName, x.ProductCategoryName })
            .Select(group => new ProductionProductItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                ProductCategoryName = group.Key.ProductCategoryName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                OrderQty = group.Sum(x => x.OrderQty),
                StockedQty = group.Sum(x => x.StockedQty),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                CompletionRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.StockedQty) / group.Sum(x => x.OrderQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.OrderQty)
            .ThenBy(x => x.ProductName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionProductItemDto>> BuildTopScrapProductsAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .Where(x => x.ScrappedQty > 0)
            .GroupBy(x => new { x.ProductId, x.ProductName, x.ProductCategoryName })
            .Select(group => new ProductionProductItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                ProductCategoryName = group.Key.ProductCategoryName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                OrderQty = group.Sum(x => x.OrderQty),
                StockedQty = group.Sum(x => x.StockedQty),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                CompletionRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.StockedQty) / group.Sum(x => x.OrderQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.ScrappedQty)
            .ThenBy(x => x.ProductName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionCategoryItemDto>> BuildCategoriesAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.ProductCategoryId, x.ProductCategoryName })
            .Select(group => new ProductionCategoryItemDto
            {
                ProductCategoryId = group.Key.ProductCategoryId,
                ProductCategoryName = group.Key.ProductCategoryName,
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                OrderQty = group.Sum(x => x.OrderQty),
                StockedQty = group.Sum(x => x.StockedQty),
                ScrappedQty = group.Sum(x => x.ScrappedQty),
                CompletionRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.StockedQty) / group.Sum(x => x.OrderQty),
                ScrapRate = group.Sum(x => x.OrderQty) == 0 ? 0m : (decimal)group.Sum(x => x.ScrappedQty) / group.Sum(x => x.OrderQty)
            })
            .OrderByDescending(x => x.OrderQty)
            .ThenBy(x => x.ProductCategoryName)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionLocationCostItemDto>> BuildLocationCostsAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        IQueryable<ProductionRoutingRow> routingRows,
        CancellationToken cancellationToken)
    {
        return await (
                from routing in routingRows
                join workOrder in workOrders on new { routing.WorkOrderId, routing.ProductId } equals new { workOrder.WorkOrderId, workOrder.ProductId }
                group new { routing, workOrder } by new { routing.LocationId, routing.LocationName } into grouped
                select new ProductionLocationCostItemDto
                {
                    LocationId = grouped.Key.LocationId,
                    LocationName = grouped.Key.LocationName,
                    PlannedCost = grouped.Sum(x => x.routing.PlannedCost),
                    ActualCost = grouped.Sum(x => x.routing.ActualCost),
                    CostVariance = grouped.Sum(x => x.routing.ActualCost) - grouped.Sum(x => x.routing.PlannedCost),
                    WorkOrders = grouped.Select(x => x.workOrder.WorkOrderId).Distinct().Count()
                })
            .OrderByDescending(x => x.ActualCost)
            .ThenBy(x => x.LocationName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionOperationVarianceItemDto>> BuildOperationVariancesAsync(
        IQueryable<ProductionRoutingRow> routingRows,
        CancellationToken cancellationToken)
    {
        return await routingRows
            .GroupBy(x => x.OperationSequence)
            .Select(group => new ProductionOperationVarianceItemDto
            {
                OperationSequence = group.Key,
                PlannedCost = group.Sum(x => x.PlannedCost),
                ActualCost = group.Sum(x => x.ActualCost),
                CostVariance = group.Sum(x => x.ActualCost) - group.Sum(x => x.PlannedCost),
                ActualResourceHours = group.Sum(x => x.ActualResourceHours)
            })
            .OrderByDescending(x => x.CostVariance)
            .ThenBy(x => x.OperationSequence)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionLocationHoursItemDto>> BuildLocationHoursAsync(
        IQueryable<ProductionRoutingRow> routingRows,
        CancellationToken cancellationToken)
    {
        return await routingRows
            .GroupBy(x => new { x.LocationId, x.LocationName })
            .Select(group => new ProductionLocationHoursItemDto
            {
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                ActualResourceHours = group.Sum(x => x.ActualResourceHours),
                PlannedCost = group.Sum(x => x.PlannedCost),
                ActualCost = group.Sum(x => x.ActualCost)
            })
            .OrderByDescending(x => x.ActualResourceHours)
            .ThenBy(x => x.LocationName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionDelayedItemDto>> BuildDelayedWorkOrdersAsync(
        IQueryable<ProductionWorkOrderRow> workOrders,
        IQueryable<ProductionRoutingRow> routingRows,
        CancellationToken cancellationToken)
    {
        var delayedWorkOrders = await workOrders
            .Where(x => x.IsDelayed)
            .Select(x => new
            {
                x.WorkOrderId,
                x.ProductId,
                x.ProductName
            })
            .ToListAsync(cancellationToken);

        if (delayedWorkOrders.Count == 0)
        {
            return [];
        }

        var delayedWorkOrderIds = delayedWorkOrders
            .Select(x => x.WorkOrderId)
            .Distinct()
            .ToList();

        var delayedRoutingRows = await routingRows
            .Where(routing => delayedWorkOrderIds.Contains(routing.WorkOrderId))
            .Select(routing => new
            {
                routing.WorkOrderId,
                routing.ProductId,
                routing.LocationId,
                routing.LocationName
            })
            .ToListAsync(cancellationToken);

        var routingLookup = delayedRoutingRows
            .GroupBy(x => new { x.WorkOrderId, x.ProductId })
            .ToDictionary(
                group => (group.Key.WorkOrderId, group.Key.ProductId),
                group => group.Select(x => new { x.LocationId, x.LocationName }).ToList());

        var delayedItems = delayedWorkOrders
            .SelectMany(workOrder =>
            {
                if (routingLookup.TryGetValue((workOrder.WorkOrderId, workOrder.ProductId), out var locations) && locations.Count > 0)
                {
                    return locations.Select(location => new ProductionDelayedItemDto
                    {
                        ProductId = workOrder.ProductId,
                        ProductName = workOrder.ProductName,
                        LocationId = location.LocationId,
                        LocationName = location.LocationName,
                        WorkOrders = 1
                    });
                }

                return new[]
                {
                    new ProductionDelayedItemDto
                    {
                        ProductId = workOrder.ProductId,
                        ProductName = workOrder.ProductName,
                        LocationId = null,
                        LocationName = "Chưa gán location",
                        WorkOrders = 1
                    }
                };
            })
            .GroupBy(x => new { x.ProductId, x.ProductName, x.LocationId, x.LocationName })
            .Select(group => new ProductionDelayedItemDto
            {
                ProductId = group.Key.ProductId,
                ProductName = group.Key.ProductName,
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                WorkOrders = group.Sum(x => x.WorkOrders)
            })
            .OrderByDescending(x => x.WorkOrders)
            .ThenBy(x => x.ProductName)
            .Take(10)
            .ToList();

        return delayedItems;
    }

    private static async Task<IReadOnlyList<ProductionInventoryItemDto>> BuildInventoryByLocationAsync(
        IQueryable<ProductionInventoryRow> inventoryRows,
        CancellationToken cancellationToken)
    {
        return await inventoryRows
            .GroupBy(x => new { x.LocationId, x.LocationName })
            .Select(group => new ProductionInventoryItemDto
            {
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                InventoryQty = group.Sum(x => x.Quantity),
                DistinctProducts = group.Select(x => x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.InventoryQty)
            .ThenBy(x => x.LocationName)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionSafetyStockItemDto>> BuildSafetyStockAlertsAsync(
        IQueryable<ProductionSafetyStockItemDto> inventoryByProduct,
        CancellationToken cancellationToken)
    {
        return await inventoryByProduct
            .Where(x => x.InventoryQty < x.SafetyStockLevel)
            .OrderByDescending(x => x.ShortageQty)
            .ThenBy(x => x.ProductName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionCostHistoryItemDto>> BuildCostHistoryAsync(
        IQueryable<ProductionCostHistoryRow> costHistoryRows,
        CancellationToken cancellationToken)
    {
        return await costHistoryRows
            .OrderByDescending(x => x.StartDate)
            .ThenBy(x => x.ProductName)
            .Take(20)
            .Select(x => new ProductionCostHistoryItemDto
            {
                ProductId = x.ProductId,
                ProductName = x.ProductName,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                StandardCost = x.StandardCost
            })
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionBomItemDto>> BuildBomSummariesAsync(
        IQueryable<ProductionBomRow> bomRows,
        CancellationToken cancellationToken)
    {
        return await bomRows
            .GroupBy(x => new { x.ProductAssemblyId, x.AssemblyName })
            .Select(group => new ProductionBomItemDto
            {
                ProductAssemblyId = group.Key.ProductAssemblyId,
                AssemblyName = group.Key.AssemblyName,
                Components = group.Select(x => x.ComponentId).Distinct().Count(),
                TotalPerAssemblyQty = group.Sum(x => x.PerAssemblyQty),
                MaxBomLevel = group.Max(x => (int)x.BomLevel)
            })
            .OrderByDescending(x => x.Components)
            .ThenBy(x => x.AssemblyName)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ProductionTransactionTrendPointDto>> BuildTransactionTrendAsync(
        IQueryable<ProductionTransactionRow> transactionRows,
        CancellationToken cancellationToken)
    {
        return await transactionRows
            .GroupBy(x => new { x.TransactionDate.Year, x.TransactionDate.Month })
            .Select(group => new ProductionTransactionTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Quantity = group.Sum(x => x.Quantity),
                ActualCost = group.Sum(x => x.ActualCost),
                Transactions = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);
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
}
