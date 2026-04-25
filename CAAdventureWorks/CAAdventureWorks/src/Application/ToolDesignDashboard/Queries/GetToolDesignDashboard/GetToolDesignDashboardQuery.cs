using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.ToolDesignDashboard.Queries.GetToolDesignDashboard;

public sealed record GetToolDesignDashboardQuery(
    int? ProductModelId = null,
    int? ProductId = null,
    int? ProductCategoryId = null,
    short? LocationId = null,
    int? VendorId = null,
    bool? MakeOnly = null,
    bool? FinishedGoodsOnly = null,
    int? MinDaysToManufacture = null,
    decimal? MinStandardCost = null) : IRequest<ToolDesignDashboardResponseDto>;

public sealed class GetToolDesignDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetToolDesignDashboardQuery, ToolDesignDashboardResponseDto>
{
    public async Task<ToolDesignDashboardResponseDto> Handle(GetToolDesignDashboardQuery request, CancellationToken cancellationToken)
    {
        var productsQuery =
            from product in context.Products.AsNoTracking()
            join model in context.ProductModels.AsNoTracking() on product.ProductModelId equals model.ProductModelId into modelJoin
            from model in modelJoin.DefaultIfEmpty()
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId into subcategoryJoin
            from subcategory in subcategoryJoin.DefaultIfEmpty()
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId into categoryJoin
            from category in categoryJoin.DefaultIfEmpty()
            where !request.ProductModelId.HasValue || product.ProductModelId == request.ProductModelId.Value
            where !request.ProductId.HasValue || product.ProductId == request.ProductId.Value
            where !request.ProductCategoryId.HasValue || (category != null && category.ProductCategoryId == request.ProductCategoryId.Value)
            where request.MakeOnly != true || product.MakeFlag
            where request.FinishedGoodsOnly != true || product.FinishedGoodsFlag
            where !request.MinDaysToManufacture.HasValue || product.DaysToManufacture >= request.MinDaysToManufacture.Value
            where !request.MinStandardCost.HasValue || product.StandardCost >= request.MinStandardCost.Value
            select new ToolDesignProductRow
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                ProductModelId = product.ProductModelId,
                ModelName = model != null ? model.Name : "Unassigned Model",
                ProductCategoryId = category != null ? category.ProductCategoryId : null,
                CategoryName = category != null ? category.Name : "Uncategorized",
                MakeFlag = product.MakeFlag,
                FinishedGoodsFlag = product.FinishedGoodsFlag,
                DaysToManufacture = product.DaysToManufacture,
                StandardCost = product.StandardCost,
                HasInstructions = model != null && model.Instructions != null
            };

        var productRows = await productsQuery.ToListAsync(cancellationToken);
        var filteredProductIds = productRows.Select(x => x.ProductId).Distinct().ToList();
        var filteredModelIds = productRows.Where(x => x.ProductModelId.HasValue).Select(x => x.ProductModelId!.Value).Distinct().ToList();

        var routingRows = await (
            from routing in context.WorkOrderRoutings.AsNoTracking()
            join location in context.Locations.AsNoTracking() on routing.LocationId equals location.LocationId
            where filteredProductIds.Contains(routing.ProductId)
            where !request.LocationId.HasValue || routing.LocationId == request.LocationId.Value
            select new ToolDesignRoutingRow
            {
                WorkOrderId = routing.WorkOrderId,
                ProductId = routing.ProductId,
                LocationId = routing.LocationId,
                LocationName = location.Name,
                PlannedCost = routing.PlannedCost,
                ActualCost = routing.ActualCost ?? 0m
            }).ToListAsync(cancellationToken);

        var vendorQuery =
            from pv in context.ProductVendors.AsNoTracking()
            join vendor in context.Vendors.AsNoTracking() on pv.BusinessEntityId equals vendor.BusinessEntityId
            where filteredProductIds.Contains(pv.ProductId)
            where !request.VendorId.HasValue || pv.BusinessEntityId == request.VendorId.Value
            select new
            {
                pv.ProductId,
                pv.BusinessEntityId,
                VendorName = vendor.Name,
                pv.AverageLeadTime
            };

        var vendorRows = await vendorQuery.ToListAsync(cancellationToken);

        var bomRows = await (
            from bom in context.BillOfMaterials.AsNoTracking()
            let productAssemblyId = bom.ProductAssemblyId
            where productAssemblyId.HasValue
            join assembly in context.Products.AsNoTracking() on productAssemblyId.Value equals assembly.ProductId
            where filteredProductIds.Contains(productAssemblyId.Value)
            select new
            {
                ProductAssemblyId = productAssemblyId.Value,
                AssemblyName = assembly.Name,
                bom.ComponentId,
                bom.PerAssemblyQty,
                BomLevel = bom.Bomlevel
            }).ToListAsync(cancellationToken);

        var inventoryRows = await (
            from inventory in context.ProductInventories.AsNoTracking()
            join location in context.Locations.AsNoTracking() on inventory.LocationId equals location.LocationId
            where filteredProductIds.Contains(inventory.ProductId)
            where !request.LocationId.HasValue || inventory.LocationId == request.LocationId.Value
            select new
            {
                inventory.LocationId,
                LocationName = location.Name,
                inventory.ProductId,
                inventory.Quantity
            }).ToListAsync(cancellationToken);

        var overview = BuildOverview(productRows, routingRows, vendorRows, bomRows);
        var modelsByProductCount = BuildModelsByProductCount(productRows);
        var instructionCoverage = BuildInstructionCoverage(productRows);
        var topComplexModels = BuildTopComplexModels(productRows);
        var topCostModels = BuildTopCostModels(productRows);
        var categoryMix = BuildCategoryMix(productRows);
        var locationLoads = BuildLocationLoads(routingRows);
        var locationCostVariances = BuildLocationCostVariances(routingRows);
        var vendorLeadTimes = BuildVendorLeadTimes(vendorRows, productRows);
        var bomComplexities = BuildBomComplexities(bomRows);
        var inventorySupport = BuildInventorySupport(inventoryRows);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new ToolDesignDashboardResponseDto
        {
            Filters = new ToolDesignDashboardAppliedFilterDto
            {
                ProductModelId = request.ProductModelId,
                ProductId = request.ProductId,
                ProductCategoryId = request.ProductCategoryId,
                LocationId = request.LocationId,
                VendorId = request.VendorId,
                MakeOnly = request.MakeOnly,
                FinishedGoodsOnly = request.FinishedGoodsOnly,
                MinDaysToManufacture = request.MinDaysToManufacture,
                MinStandardCost = request.MinStandardCost
            },
            Overview = overview,
            ModelsByProductCount = modelsByProductCount,
            InstructionCoverage = instructionCoverage,
            TopComplexModels = topComplexModels,
            TopCostModels = topCostModels,
            CategoryMix = categoryMix,
            LocationLoads = locationLoads,
            LocationCostVariances = locationCostVariances,
            VendorLeadTimes = vendorLeadTimes,
            BomComplexities = bomComplexities,
            InventorySupport = inventorySupport,
            FilterOptions = filterOptions
        };
    }

    private static ToolDesignOverviewDto BuildOverview(
        IReadOnlyList<ToolDesignProductRow> productRows,
        IReadOnlyList<ToolDesignRoutingRow> routingRows,
        IReadOnlyList<dynamic> vendorRows,
        IReadOnlyList<dynamic> bomRows)
    {
        var totalModels = productRows.Where(x => x.ProductModelId.HasValue).Select(x => x.ProductModelId!.Value).Distinct().Count();
        var modelsWithInstructions = productRows.Where(x => x.ProductModelId.HasValue && x.HasInstructions).Select(x => x.ProductModelId!.Value).Distinct().Count();
        var complexModels = productRows
            .Where(x => x.ProductModelId.HasValue && (x.DaysToManufacture >= 3 || x.StandardCost >= 1000m))
            .Select(x => x.ProductModelId!.Value)
            .Distinct()
            .Count();

        return new ToolDesignOverviewDto
        {
            TotalModels = totalModels,
            TotalProducts = productRows.Select(x => x.ProductId).Distinct().Count(),
            ModelsWithInstructions = modelsWithInstructions,
            InstructionCoverageRate = totalModels == 0 ? 0m : (decimal)modelsWithInstructions / totalModels,
            ComplexModels = complexModels,
            VendorDependentProducts = vendorRows.Select(x => (int)x.ProductId).Distinct().Count(),
            ActiveWorkCenters = routingRows.Select(x => x.LocationId).Distinct().Count(),
            BomAssemblies = bomRows.Select(x => (int)x.ProductAssemblyId).Distinct().Count()
        };
    }

    private static IReadOnlyList<ToolDesignModelCountItemDto> BuildModelsByProductCount(IReadOnlyList<ToolDesignProductRow> productRows)
        => productRows
            .Where(x => x.ProductModelId.HasValue)
            .GroupBy(x => new { x.ProductModelId, x.ModelName })
            .Select(group => new ToolDesignModelCountItemDto
            {
                ProductModelId = group.Key.ProductModelId!.Value,
                ModelName = group.Key.ModelName,
                ProductCount = group.Select(x => x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.ProductCount)
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignStatusItemDto> BuildInstructionCoverage(IReadOnlyList<ToolDesignProductRow> productRows)
    {
        var modelStatuses = productRows
            .Where(x => x.ProductModelId.HasValue)
            .GroupBy(x => new { x.ProductModelId, x.ModelName })
            .Select(group => group.Any(x => x.HasInstructions) ? "Có instruction" : "Chưa có instruction")
            .GroupBy(x => x)
            .Select(group => new ToolDesignStatusItemDto
            {
                Status = group.Key,
                Models = group.Count()
            })
            .ToList();

        return modelStatuses;
    }

    private static IReadOnlyList<ToolDesignComplexityItemDto> BuildTopComplexModels(IReadOnlyList<ToolDesignProductRow> productRows)
        => productRows
            .Where(x => x.ProductModelId.HasValue)
            .GroupBy(x => new { x.ProductModelId, x.ModelName })
            .Select(group => new ToolDesignComplexityItemDto
            {
                ProductModelId = group.Key.ProductModelId!.Value,
                ModelName = group.Key.ModelName,
                AverageDaysToManufacture = (decimal)group.Average(x => x.DaysToManufacture),
                AverageStandardCost = group.Average(x => x.StandardCost),
                ProductCount = group.Select(x => x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.AverageDaysToManufacture)
            .ThenByDescending(x => x.AverageStandardCost)
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignCostItemDto> BuildTopCostModels(IReadOnlyList<ToolDesignProductRow> productRows)
        => productRows
            .Where(x => x.ProductModelId.HasValue)
            .GroupBy(x => new { x.ProductModelId, x.ModelName })
            .Select(group => new ToolDesignCostItemDto
            {
                ProductModelId = group.Key.ProductModelId!.Value,
                ModelName = group.Key.ModelName,
                AverageStandardCost = group.Average(x => x.StandardCost),
                MaxStandardCost = group.Max(x => x.StandardCost)
            })
            .OrderByDescending(x => x.AverageStandardCost)
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignCategoryMixItemDto> BuildCategoryMix(IReadOnlyList<ToolDesignProductRow> productRows)
        => productRows
            .GroupBy(x => new { x.ProductCategoryId, x.CategoryName })
            .Select(group => new ToolDesignCategoryMixItemDto
            {
                ProductCategoryId = group.Key.ProductCategoryId ?? 0,
                CategoryName = group.Key.CategoryName,
                Models = group.Where(x => x.ProductModelId.HasValue).Select(x => x.ProductModelId!.Value).Distinct().Count(),
                Products = group.Select(x => x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.Products)
            .ToList();

    private static IReadOnlyList<ToolDesignLocationLoadItemDto> BuildLocationLoads(IReadOnlyList<ToolDesignRoutingRow> routingRows)
        => routingRows
            .GroupBy(x => new { x.LocationId, x.LocationName })
            .Select(group => new ToolDesignLocationLoadItemDto
            {
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                RoutingSteps = group.Count(),
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count()
            })
            .OrderByDescending(x => x.RoutingSteps)
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignCostVarianceItemDto> BuildLocationCostVariances(IReadOnlyList<ToolDesignRoutingRow> routingRows)
        => routingRows
            .GroupBy(x => new { x.LocationId, x.LocationName })
            .Select(group => new ToolDesignCostVarianceItemDto
            {
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                PlannedCost = group.Sum(x => x.PlannedCost),
                ActualCost = group.Sum(x => x.ActualCost),
                CostVariance = group.Sum(x => x.ActualCost - x.PlannedCost)
            })
            .OrderByDescending(x => Math.Abs(x.CostVariance))
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignLeadTimeItemDto> BuildVendorLeadTimes(IReadOnlyList<dynamic> vendorRows, IReadOnlyList<ToolDesignProductRow> productRows)
    {
        var productLookup = productRows.ToDictionary(x => x.ProductId, x => x);

        return vendorRows
            .GroupBy(x => new { x.BusinessEntityId, x.VendorName })
            .Select(group => new ToolDesignLeadTimeItemDto
            {
                Id = group.Key.BusinessEntityId,
                Name = group.Key.VendorName,
                AverageLeadTime = group.Average(x => (decimal)x.AverageLeadTime),
                ProductCount = group.Select(x => (int)x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.AverageLeadTime)
            .Take(10)
            .ToList();
    }

    private static IReadOnlyList<ToolDesignBomComplexityItemDto> BuildBomComplexities(IReadOnlyList<dynamic> bomRows)
        => bomRows
            .GroupBy(x => new { x.ProductAssemblyId, x.AssemblyName })
            .Select(group => new ToolDesignBomComplexityItemDto
            {
                ProductAssemblyId = group.Key.ProductAssemblyId,
                AssemblyName = group.Key.AssemblyName,
                Components = group.Select(x => (int)x.ComponentId).Distinct().Count(),
                TotalPerAssemblyQty = group.Sum(x => (decimal)x.PerAssemblyQty),
                MaxBomLevel = group.Max(x => (short)x.BomLevel)
            })
            .OrderByDescending(x => x.Components)
            .Take(10)
            .ToList();

    private static IReadOnlyList<ToolDesignInventorySupportItemDto> BuildInventorySupport(IReadOnlyList<dynamic> inventoryRows)
        => inventoryRows
            .GroupBy(x => new { x.LocationId, x.LocationName })
            .Select(group => new ToolDesignInventorySupportItemDto
            {
                LocationId = group.Key.LocationId,
                LocationName = group.Key.LocationName,
                InventoryQty = group.Sum(x => (int)x.Quantity),
                DistinctProducts = group.Select(x => (int)x.ProductId).Distinct().Count()
            })
            .OrderByDescending(x => x.InventoryQty)
            .Take(10)
            .ToList();

    private async Task<ToolDesignDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var productModels = await context.ProductModels.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ToolDesignFilterLookupItemDto(x.ProductModelId, x.Name))
            .ToListAsync(cancellationToken);

        var products = await context.Products.AsNoTracking()
            .Where(x => x.ProductModelId != null)
            .OrderBy(x => x.Name)
            .Select(x => new ToolDesignFilterLookupItemDto(x.ProductId, x.Name))
            .ToListAsync(cancellationToken);

        var productCategories = await context.ProductCategories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ToolDesignFilterLookupItemDto(x.ProductCategoryId, x.Name))
            .ToListAsync(cancellationToken);

        var locations = await context.Locations.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ToolDesignLocationFilterLookupItemDto(x.LocationId, x.Name))
            .ToListAsync(cancellationToken);

        var vendors = await context.Vendors.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ToolDesignFilterLookupItemDto(x.BusinessEntityId, x.Name))
            .ToListAsync(cancellationToken);

        return new ToolDesignDashboardFilterOptionsDto
        {
            ProductModels = productModels,
            Products = products,
            ProductCategories = productCategories,
            Locations = locations,
            Vendors = vendors
        };
    }
}
