using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.ExecutiveDashboard.Queries.GetExecutiveDashboard;

public sealed record GetExecutiveDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    int? TerritoryId = null,
    int? SalesPersonId = null,
    int? VendorId = null,
    short? DepartmentId = null,
    int? ProductCategoryId = null,
    bool? CurrentEmployeesOnly = true) : IRequest<ExecutiveDashboardResponseDto>;

public sealed class GetExecutiveDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetExecutiveDashboardQuery, ExecutiveDashboardResponseDto>
{
    public async Task<ExecutiveDashboardResponseDto> Handle(GetExecutiveDashboardQuery request, CancellationToken cancellationToken)
    {
        var salesHeaders = context.SalesOrderHeaders
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.OrderDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.OrderDate <= request.EndDate.Value)
            .Where(x => !request.TerritoryId.HasValue || x.TerritoryId == request.TerritoryId.Value)
            .Where(x => !request.SalesPersonId.HasValue || x.SalesPersonId == request.SalesPersonId.Value)
            .Select(x => new ExecutiveSalesHeaderRow
            {
                SalesOrderId = x.SalesOrderId,
                OrderDate = x.OrderDate,
                Status = x.Status,
                TerritoryId = x.TerritoryId,
                SalesPersonId = x.SalesPersonId,
                TotalDue = x.TotalDue
            });

        var purchaseHeaders = context.PurchaseOrderHeaders
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.OrderDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.OrderDate <= request.EndDate.Value)
            .Where(x => !request.VendorId.HasValue || x.VendorId == request.VendorId.Value)
            .Select(x => new ExecutivePurchaseHeaderRow
            {
                PurchaseOrderId = x.PurchaseOrderId,
                OrderDate = x.OrderDate,
                Status = x.Status,
                VendorId = x.VendorId,
                TotalDue = x.TotalDue
            });

        var departmentRows =
            from history in context.EmployeeDepartmentHistories.AsNoTracking()
            join department in context.Departments.AsNoTracking() on history.DepartmentId equals department.DepartmentId
            join employee in context.Employees.AsNoTracking() on history.BusinessEntityId equals employee.BusinessEntityId
            where !request.DepartmentId.HasValue || history.DepartmentId == request.DepartmentId.Value
            where request.CurrentEmployeesOnly != true || history.EndDate == null
            where request.CurrentEmployeesOnly != true || employee.CurrentFlag
            select new ExecutiveDepartmentRow
            {
                BusinessEntityId = history.BusinessEntityId,
                DepartmentId = history.DepartmentId,
                DepartmentName = department.Name,
                GroupName = department.GroupName
            };

        var workOrders =
            from workOrder in context.WorkOrders.AsNoTracking()
            join product in context.Products.AsNoTracking() on workOrder.ProductId equals product.ProductId
            join subcategory in context.ProductSubcategories.AsNoTracking() on product.ProductSubcategoryId equals subcategory.ProductSubcategoryId
            join category in context.ProductCategories.AsNoTracking() on subcategory.ProductCategoryId equals category.ProductCategoryId
            where !request.StartDate.HasValue || workOrder.StartDate >= request.StartDate.Value
            where !request.EndDate.HasValue || workOrder.StartDate <= request.EndDate.Value
            where !request.ProductCategoryId.HasValue || category.ProductCategoryId == request.ProductCategoryId.Value
            select new ExecutiveWorkOrderRow
            {
                WorkOrderId = workOrder.WorkOrderId,
                ProductCategoryId = category.ProductCategoryId,
                ProductCategoryName = category.Name,
                OrderQty = workOrder.OrderQty,
                StockedQty = workOrder.StockedQty,
                ScrappedQty = workOrder.ScrappedQty
            };

        var overview = await BuildOverviewAsync(salesHeaders, purchaseHeaders, departmentRows, workOrders, cancellationToken);
        var revenueVsSpendTrend = await BuildRevenueVsSpendTrendAsync(salesHeaders, purchaseHeaders, cancellationToken);
        var revenueByTerritory = await BuildRevenueByTerritoryAsync(request, salesHeaders, cancellationToken);
        var topSalesPeople = await BuildTopSalesPeopleAsync(request, salesHeaders, cancellationToken);
        var headcountByDepartment = await BuildHeadcountByDepartmentAsync(departmentRows, cancellationToken);
        var headcountByGroup = await BuildHeadcountByGroupAsync(departmentRows, cancellationToken);
        var topVendors = await BuildTopVendorsAsync(request, purchaseHeaders, cancellationToken);
        var vendorReceivingRates = await BuildVendorReceivingRatesAsync(request, cancellationToken);
        var productionByCategory = await BuildProductionByCategoryAsync(workOrders, cancellationToken);
        var salesOrderStatuses = await BuildSalesOrderStatusesAsync(salesHeaders, cancellationToken);
        var purchaseOrderStatuses = await BuildPurchaseOrderStatusesAsync(purchaseHeaders, cancellationToken);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new ExecutiveDashboardResponseDto
        {
            Filters = new ExecutiveDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                TerritoryId = request.TerritoryId,
                SalesPersonId = request.SalesPersonId,
                VendorId = request.VendorId,
                DepartmentId = request.DepartmentId,
                ProductCategoryId = request.ProductCategoryId,
                CurrentEmployeesOnly = request.CurrentEmployeesOnly
            },
            Overview = overview,
            RevenueVsSpendTrend = revenueVsSpendTrend,
            RevenueByTerritory = revenueByTerritory,
            TopSalesPeople = topSalesPeople,
            HeadcountByDepartment = headcountByDepartment,
            HeadcountByGroup = headcountByGroup,
            TopVendors = topVendors,
            VendorReceivingRates = vendorReceivingRates,
            ProductionByCategory = productionByCategory,
            SalesOrderStatuses = salesOrderStatuses,
            PurchaseOrderStatuses = purchaseOrderStatuses,
            FilterOptions = filterOptions
        };
    }

    private static async Task<ExecutiveOverviewDto> BuildOverviewAsync(
        IQueryable<ExecutiveSalesHeaderRow> salesHeaders,
        IQueryable<ExecutivePurchaseHeaderRow> purchaseHeaders,
        IQueryable<ExecutiveDepartmentRow> departmentRows,
        IQueryable<ExecutiveWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        var salesAggregate = await salesHeaders
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalRevenue = group.Sum(x => x.TotalDue),
                SalesOrders = group.Select(x => x.SalesOrderId).Distinct().Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        var purchasingAggregate = await purchaseHeaders
            .GroupBy(_ => 1)
            .Select(group => new
            {
                TotalSpend = group.Sum(x => x.TotalDue),
                PurchaseOrders = group.Select(x => x.PurchaseOrderId).Distinct().Count()
            })
            .FirstOrDefaultAsync(cancellationToken);

        var activeEmployees = await departmentRows
            .Select(x => x.BusinessEntityId)
            .Distinct()
            .CountAsync(cancellationToken);

        var productionAggregate = await workOrders
            .GroupBy(_ => 1)
            .Select(group => new
            {
                WorkOrders = group.Select(x => x.WorkOrderId).Distinct().Count(),
                OrderQty = group.Sum(x => x.OrderQty),
                StockedQty = group.Sum(x => x.StockedQty),
                ScrappedQty = group.Sum(x => x.ScrappedQty)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var totalRevenue = salesAggregate?.TotalRevenue ?? 0m;
        var totalSpend = purchasingAggregate?.TotalSpend ?? 0m;
        var totalOrderQty = productionAggregate?.OrderQty ?? 0;

        return new ExecutiveOverviewDto
        {
            TotalRevenue = totalRevenue,
            TotalSpend = totalSpend,
            OperatingGap = totalRevenue - totalSpend,
            SalesOrders = salesAggregate?.SalesOrders ?? 0,
            PurchaseOrders = purchasingAggregate?.PurchaseOrders ?? 0,
            ActiveEmployees = activeEmployees,
            WorkOrders = productionAggregate?.WorkOrders ?? 0,
            ProductionCompletionRate = totalOrderQty == 0 ? 0m : (decimal)(productionAggregate?.StockedQty ?? 0) / totalOrderQty,
            ProductionScrapRate = totalOrderQty == 0 ? 0m : (decimal)(productionAggregate?.ScrappedQty ?? 0) / totalOrderQty
        };
    }

    private static async Task<IReadOnlyList<ExecutiveTrendPointDto>> BuildRevenueVsSpendTrendAsync(
        IQueryable<ExecutiveSalesHeaderRow> salesHeaders,
        IQueryable<ExecutivePurchaseHeaderRow> purchaseHeaders,
        CancellationToken cancellationToken)
    {
        var revenueByMonth = await salesHeaders
            .GroupBy(x => new { x.OrderDate.Year, x.OrderDate.Month })
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                Revenue = group.Sum(x => x.TotalDue)
            })
            .ToListAsync(cancellationToken);

        var spendByMonth = await purchaseHeaders
            .GroupBy(x => new { x.OrderDate.Year, x.OrderDate.Month })
            .Select(group => new
            {
                group.Key.Year,
                group.Key.Month,
                Spend = group.Sum(x => x.TotalDue)
            })
            .ToListAsync(cancellationToken);

        var merged = revenueByMonth
            .Select(x => new { x.Year, x.Month, x.Revenue, Spend = 0m })
            .Concat(spendByMonth.Select(x => new { x.Year, x.Month, Revenue = 0m, x.Spend }))
            .GroupBy(x => new { x.Year, x.Month })
            .Select(group => new ExecutiveTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Revenue = group.Sum(x => x.Revenue),
                Spend = group.Sum(x => x.Spend),
                OperatingGap = group.Sum(x => x.Revenue) - group.Sum(x => x.Spend)
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return merged;
    }

    private async Task<IReadOnlyList<ExecutiveTerritoryRevenueItemDto>> BuildRevenueByTerritoryAsync(
        GetExecutiveDashboardQuery request,
        IQueryable<ExecutiveSalesHeaderRow> salesHeaders,
        CancellationToken cancellationToken)
    {
        return await (
                from header in salesHeaders
                where header.TerritoryId != null
                join territory in context.SalesTerritories.AsNoTracking() on header.TerritoryId equals territory.TerritoryId
                group new { header, territory } by new { territory.TerritoryId, territory.Name, territory.Group } into grouped
                select new ExecutiveTerritoryRevenueItemDto
                {
                    TerritoryId = grouped.Key.TerritoryId,
                    TerritoryName = grouped.Key.Name,
                    TerritoryGroup = grouped.Key.Group,
                    Revenue = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count()
                })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<ExecutiveSalesPersonItemDto>> BuildTopSalesPeopleAsync(
        GetExecutiveDashboardQuery request,
        IQueryable<ExecutiveSalesHeaderRow> salesHeaders,
        CancellationToken cancellationToken)
    {
        return await (
                from header in salesHeaders
                where header.SalesPersonId != null
                join salesPerson in context.VSalesPeople.AsNoTracking() on header.SalesPersonId equals salesPerson.BusinessEntityId
                group new { header, salesPerson } by new
                {
                    salesPerson.BusinessEntityId,
                    salesPerson.FirstName,
                    salesPerson.LastName,
                    salesPerson.TerritoryName,
                    salesPerson.SalesQuota
                }
                into grouped
                select new ExecutiveSalesPersonItemDto
                {
                    SalesPersonId = grouped.Key.BusinessEntityId,
                    SalesPersonName = grouped.Key.FirstName + " " + grouped.Key.LastName,
                    TerritoryName = grouped.Key.TerritoryName ?? string.Empty,
                    Revenue = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.header.SalesOrderId).Distinct().Count(),
                    SalesQuota = grouped.Key.SalesQuota,
                    AchievementRate = grouped.Key.SalesQuota.HasValue && grouped.Key.SalesQuota.Value > 0
                        ? grouped.Sum(x => x.header.TotalDue) / grouped.Key.SalesQuota.Value
                        : null
                })
            .OrderByDescending(x => x.Revenue)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ExecutiveDepartmentHeadcountItemDto>> BuildHeadcountByDepartmentAsync(
        IQueryable<ExecutiveDepartmentRow> departmentRows,
        CancellationToken cancellationToken)
    {
        return await departmentRows
            .GroupBy(x => new { x.DepartmentId, x.DepartmentName, x.GroupName })
            .Select(group => new ExecutiveDepartmentHeadcountItemDto
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

    private static async Task<IReadOnlyList<ExecutiveHeadcountGroupItemDto>> BuildHeadcountByGroupAsync(
        IQueryable<ExecutiveDepartmentRow> departmentRows,
        CancellationToken cancellationToken)
    {
        return await departmentRows
            .GroupBy(x => x.GroupName)
            .Select(group => new ExecutiveHeadcountGroupItemDto
            {
                GroupName = group.Key,
                Headcount = group.Select(x => x.BusinessEntityId).Distinct().Count()
            })
            .OrderByDescending(x => x.Headcount)
            .ThenBy(x => x.GroupName)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<ExecutiveVendorSpendItemDto>> BuildTopVendorsAsync(
        GetExecutiveDashboardQuery request,
        IQueryable<ExecutivePurchaseHeaderRow> purchaseHeaders,
        CancellationToken cancellationToken)
    {
        return await (
                from header in purchaseHeaders
                join vendor in context.Vendors.AsNoTracking() on header.VendorId equals vendor.BusinessEntityId
                group new { header, vendor } by new { vendor.BusinessEntityId, vendor.Name } into grouped
                select new ExecutiveVendorSpendItemDto
                {
                    VendorId = grouped.Key.BusinessEntityId,
                    VendorName = grouped.Key.Name,
                    TotalSpend = grouped.Sum(x => x.header.TotalDue),
                    Orders = grouped.Select(x => x.header.PurchaseOrderId).Distinct().Count(),
                    AverageOrderValue = grouped.Select(x => x.header.PurchaseOrderId).Distinct().Count() == 0
                        ? 0m
                        : grouped.Sum(x => x.header.TotalDue) / grouped.Select(x => x.header.PurchaseOrderId).Distinct().Count()
                })
            .OrderByDescending(x => x.TotalSpend)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<ExecutiveVendorReceivingRateItemDto>> BuildVendorReceivingRatesAsync(
        GetExecutiveDashboardQuery request,
        CancellationToken cancellationToken)
    {
        return await (
                from detail in context.PurchaseOrderDetails.AsNoTracking()
                join header in context.PurchaseOrderHeaders.AsNoTracking() on detail.PurchaseOrderId equals header.PurchaseOrderId
                join vendor in context.Vendors.AsNoTracking() on header.VendorId equals vendor.BusinessEntityId
                where !request.StartDate.HasValue || header.OrderDate >= request.StartDate.Value
                where !request.EndDate.HasValue || header.OrderDate <= request.EndDate.Value
                where !request.VendorId.HasValue || header.VendorId == request.VendorId.Value
                group detail by new { vendor.BusinessEntityId, vendor.Name } into grouped
                select new ExecutiveVendorReceivingRateItemDto
                {
                    VendorId = grouped.Key.BusinessEntityId,
                    VendorName = grouped.Key.Name,
                    OrderedQty = grouped.Sum(x => (decimal)x.OrderQty),
                    ReceivedQty = grouped.Sum(x => x.ReceivedQty),
                    ReceivingRate = grouped.Sum(x => (decimal)x.OrderQty) == 0
                        ? 0m
                        : grouped.Sum(x => x.ReceivedQty) / grouped.Sum(x => (decimal)x.OrderQty)
                })
            .OrderByDescending(x => x.ReceivingRate)
            .ThenByDescending(x => x.OrderedQty)
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ExecutiveProductionCategoryItemDto>> BuildProductionByCategoryAsync(
        IQueryable<ExecutiveWorkOrderRow> workOrders,
        CancellationToken cancellationToken)
    {
        return await workOrders
            .GroupBy(x => new { x.ProductCategoryId, x.ProductCategoryName })
            .Select(group => new ExecutiveProductionCategoryItemDto
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
            .OrderByDescending(x => x.StockedQty)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ExecutiveOrderStatusItemDto>> BuildSalesOrderStatusesAsync(
        IQueryable<ExecutiveSalesHeaderRow> salesHeaders,
        CancellationToken cancellationToken)
    {
        return await salesHeaders
            .GroupBy(x => x.Status)
            .Select(group => new ExecutiveOrderStatusItemDto
            {
                Source = "Sales",
                Status = group.Key,
                StatusLabel = GetSalesStatusLabel(group.Key),
                Orders = group.Select(x => x.SalesOrderId).Distinct().Count()
            })
            .OrderBy(x => x.Status)
            .ToListAsync(cancellationToken);
    }

    private static async Task<IReadOnlyList<ExecutiveOrderStatusItemDto>> BuildPurchaseOrderStatusesAsync(
        IQueryable<ExecutivePurchaseHeaderRow> purchaseHeaders,
        CancellationToken cancellationToken)
    {
        return await purchaseHeaders
            .GroupBy(x => x.Status)
            .Select(group => new ExecutiveOrderStatusItemDto
            {
                Source = "Purchasing",
                Status = group.Key,
                StatusLabel = GetPurchaseStatusLabel(group.Key),
                Orders = group.Select(x => x.PurchaseOrderId).Distinct().Count()
            })
            .OrderBy(x => x.Status)
            .ToListAsync(cancellationToken);
    }

    private async Task<ExecutiveDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var territories = await context.SalesTerritories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ExecutiveFilterLookupItemDto(x.TerritoryId, x.Name))
            .ToListAsync(cancellationToken);

        var salesPeople = await context.VSalesPeople.AsNoTracking()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new ExecutiveFilterLookupItemDto(x.BusinessEntityId, x.FirstName + " " + x.LastName))
            .ToListAsync(cancellationToken);

        var vendors = await context.Vendors.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ExecutiveFilterLookupItemDto(x.BusinessEntityId, x.Name))
            .ToListAsync(cancellationToken);

        var departments = await context.Departments.AsNoTracking()
            .OrderBy(x => x.GroupName)
            .ThenBy(x => x.Name)
            .Select(x => new ExecutiveDepartmentFilterLookupItemDto(x.DepartmentId, x.Name, x.GroupName))
            .ToListAsync(cancellationToken);

        var productCategories = await context.ProductCategories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ExecutiveFilterLookupItemDto(x.ProductCategoryId, x.Name))
            .ToListAsync(cancellationToken);

        return new ExecutiveDashboardFilterOptionsDto
        {
            Territories = territories,
            SalesPeople = salesPeople,
            Vendors = vendors,
            Departments = departments,
            ProductCategories = productCategories
        };
    }
    private static string GetSalesStatusLabel(byte status) => status switch
    {
        1 => "In process",
        2 => "Approved",
        3 => "Backordered",
        4 => "Rejected",
        5 => "Shipped",
        6 => "Cancelled",
        _ => $"Status {status}"
    };

    private static string GetPurchaseStatusLabel(byte status) => status switch
    {
        1 => "Pending",
        2 => "Approved",
        3 => "Rejected",
        4 => "Complete",
        _ => $"Status {status}"
    };
}
