using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.FinanceDashboard.Queries.GetFinanceDashboard;

public sealed record GetFinanceDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? CurrencyCode = null,
    int? TerritoryId = null) : IRequest<FinanceDashboardResponseDto>;

public sealed class GetFinanceDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetFinanceDashboardQuery, FinanceDashboardResponseDto>
{
    public async Task<FinanceDashboardResponseDto> Handle(GetFinanceDashboardQuery request, CancellationToken cancellationToken)
    {
        // Query cơ bản cho Sales Orders với filter
        var baseSalesQuery = context.SalesOrderHeaders.AsNoTracking()
            .Where(so => !request.StartDate.HasValue || so.OrderDate >= request.StartDate.Value)
            .Where(so => !request.EndDate.HasValue || so.OrderDate <= request.EndDate.Value)
            .Where(so => !request.TerritoryId.HasValue || so.TerritoryId == request.TerritoryId.Value);

        // Query cơ bản cho Purchase Orders với filter
        var basePurchaseQuery = context.PurchaseOrderHeaders.AsNoTracking()
            .Where(po => !request.StartDate.HasValue || po.OrderDate >= request.StartDate.Value)
            .Where(po => !request.EndDate.HasValue || po.OrderDate <= request.EndDate.Value);

        // Lấy dữ liệu tối ưu - chỉ select các cột cần thiết
        var salesData = await baseSalesQuery
            .Select(so => new FinanceSalesOrderSummary
            {
                SalesOrderId = so.SalesOrderId,
                OrderDate = so.OrderDate,
                TotalDue = so.TotalDue,
                TaxAmt = so.TaxAmt,
                SubTotal = so.SubTotal,
                CurrencyRateId = so.CurrencyRateId,
                CreditCardId = so.CreditCardId,
                ShipToAddressId = so.ShipToAddressId,
                TerritoryId = so.TerritoryId
            })
            .ToListAsync(cancellationToken);

        var purchaseData = await basePurchaseQuery
            .Select(po => new FinancePurchaseOrderSummary
            {
                PurchaseOrderId = po.PurchaseOrderId,
                OrderDate = po.OrderDate,
                TotalDue = po.TotalDue
            })
            .ToListAsync(cancellationToken);

        var overview = BuildOverview(salesData, purchaseData);
        var revenueTrend = BuildRevenueTrend(salesData);
        var expenseTrend = BuildExpenseTrend(purchaseData);
        var profitTrend = BuildProfitTrend(salesData, purchaseData);
        var taxByRegion = await BuildTaxByRegionAsync(request, cancellationToken);
        var revenueByCurrency = await BuildRevenueByCurrencyAsync(salesData, cancellationToken);
        var paymentMethods = await BuildPaymentMethodsAsync(salesData, cancellationToken);
        var cashFlow = BuildCashFlow(salesData, purchaseData);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new FinanceDashboardResponseDto
        {
            Filters = new FinanceDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                CurrencyCode = request.CurrencyCode,
                TerritoryId = request.TerritoryId
            },
            Overview = overview,
            RevenueTrend = revenueTrend,
            ExpenseTrend = expenseTrend,
            ProfitTrend = profitTrend,
            TaxByRegion = taxByRegion,
            RevenueByCurrency = revenueByCurrency,
            PaymentMethods = paymentMethods,
            CashFlow = cashFlow,
            FilterOptions = filterOptions
        };
    }

    private static FinanceOverviewDto BuildOverview(
        List<FinanceSalesOrderSummary> salesData,
        List<FinancePurchaseOrderSummary> purchaseData)
    {
        var totalRevenue = salesData.Sum(so => so.TotalDue);
        var totalExpense = purchaseData.Sum(po => po.TotalDue);
        var grossProfit = totalRevenue - totalExpense;
        var profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        var totalTax = salesData.Sum(so => so.TaxAmt);
        var avgTaxRate = totalRevenue > 0 ? (totalTax / totalRevenue) * 100 : 0;

        return new FinanceOverviewDto
        {
            TotalRevenue = totalRevenue,
            TotalExpense = totalExpense,
            GrossProfit = grossProfit,
            ProfitMargin = profitMargin,
            TotalTax = totalTax,
            AverageTaxRate = avgTaxRate,
            CashFlow = grossProfit,
            TotalOrders = salesData.Count
        };
    }

    private static IReadOnlyList<FinanceTrendPointDto> BuildRevenueTrend(
        List<FinanceSalesOrderSummary> salesData)
    {
        return salesData
            .GroupBy(so => new { so.OrderDate.Year, so.OrderDate.Month })
            .Select(group => new FinanceTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Amount = group.Sum(so => so.TotalDue),
                Count = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();
    }

    private static IReadOnlyList<FinanceTrendPointDto> BuildExpenseTrend(
        List<FinancePurchaseOrderSummary> purchaseData)
    {
        return purchaseData
            .GroupBy(po => new { po.OrderDate.Year, po.OrderDate.Month })
            .Select(group => new FinanceTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Amount = group.Sum(po => po.TotalDue),
                Count = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();
    }

    private static IReadOnlyList<FinanceTrendPointDto> BuildProfitTrend(
        List<FinanceSalesOrderSummary> salesData,
        List<FinancePurchaseOrderSummary> purchaseData)
    {
        var revenueByMonth = salesData
            .GroupBy(so => new { so.OrderDate.Year, so.OrderDate.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => g.Sum(so => so.TotalDue)
            );

        var expenseByMonth = purchaseData
            .GroupBy(po => new { po.OrderDate.Year, po.OrderDate.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => g.Sum(po => po.TotalDue)
            );

        var allMonths = revenueByMonth.Keys.Union(expenseByMonth.Keys).OrderBy(x => x.Year).ThenBy(x => x.Month);

        return allMonths.Select(month =>
        {
            var revenue = revenueByMonth.GetValueOrDefault(month, 0);
            var expense = expenseByMonth.GetValueOrDefault(month, 0);
            return new FinanceTrendPointDto
            {
                Period = $"{month.Year}-{month.Month:00}",
                Year = month.Year,
                Month = month.Month,
                Amount = revenue - expense,
                Count = 0
            };
        }).ToList();
    }

    private async Task<IReadOnlyList<FinanceTaxItemDto>> BuildTaxByRegionAsync(
        GetFinanceDashboardQuery request,
        CancellationToken cancellationToken)
    {
        // Áp dụng trực tiếp bộ lọc gốc thay vì dùng danh sách ID
        var taxData = await context.SalesOrderHeaders.AsNoTracking()
            .Where(so => !request.StartDate.HasValue || so.OrderDate >= request.StartDate.Value)
            .Where(so => !request.EndDate.HasValue || so.OrderDate <= request.EndDate.Value)
            .Where(so => !request.TerritoryId.HasValue || so.TerritoryId == request.TerritoryId.Value)
            .Join(context.Addresses.AsNoTracking(),
                so => so.ShipToAddressId,
                addr => addr.AddressId,
                (so, addr) => new { so, addr })
            .Join(context.StateProvinces.AsNoTracking(),
                x => x.addr.StateProvinceId,
                sp => sp.StateProvinceId,
                (x, sp) => new
                {
                    sp.StateProvinceId,
                    StateProvinceName = sp.Name,
                    x.so.TaxAmt,
                    x.so.SubTotal
                })
            .GroupBy(x => new { x.StateProvinceId, x.StateProvinceName })
            .Select(group => new FinanceTaxItemDto
            {
                StateProvinceId = group.Key.StateProvinceId,
                StateProvinceName = group.Key.StateProvinceName,
                TotalTax = group.Sum(x => x.TaxAmt),
                AverageTaxRate = group.Sum(x => x.SubTotal) > 0
                    ? (group.Sum(x => x.TaxAmt) / group.Sum(x => x.SubTotal)) * 100
                    : 0,
                OrderCount = group.Count()
            })
            .OrderByDescending(x => x.TotalTax)
            .Take(10)
            .ToListAsync(cancellationToken);

        return taxData;
    }

    private async Task<IReadOnlyList<FinanceCurrencyItemDto>> BuildRevenueByCurrencyAsync(
        List<FinanceSalesOrderSummary> salesData,
        CancellationToken cancellationToken)
    {
        var total = salesData.Sum(so => so.TotalDue);

        if (!salesData.Any())
            return new List<FinanceCurrencyItemDto>();

        // Lấy thông tin currency từ CurrencyRate
        var currencyRateIds = salesData
            .Where(so => so.CurrencyRateId.HasValue)
            .Select(so => so.CurrencyRateId!.Value)
            .Distinct()
            .ToList();

        var currencyRates = await context.CurrencyRates.AsNoTracking()
            .Where(cr => currencyRateIds.Contains(cr.CurrencyRateId))
            .Select(cr => new { cr.CurrencyRateId, cr.ToCurrencyCode })
            .ToListAsync(cancellationToken);

        var currencyDict = currencyRates.ToDictionary(cr => cr.CurrencyRateId, cr => cr.ToCurrencyCode);

        var byCurrency = salesData
            .GroupBy(so => so.CurrencyRateId.HasValue && currencyDict.ContainsKey(so.CurrencyRateId.Value)
                ? currencyDict[so.CurrencyRateId.Value]
                : "USD")
            .Select(group => new FinanceCurrencyItemDto
            {
                CurrencyCode = group.Key,
                CurrencyName = group.Key,
                TotalRevenue = group.Sum(so => so.TotalDue),
                OrderCount = group.Count(),
                Percentage = total > 0 ? (group.Sum(so => so.TotalDue) / total) * 100 : 0
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToList();

        return byCurrency;
    }

    private async Task<IReadOnlyList<FinancePaymentMethodItemDto>> BuildPaymentMethodsAsync(
        List<FinanceSalesOrderSummary> salesData,
        CancellationToken cancellationToken)
    {
        var total = salesData.Sum(so => so.TotalDue);

        if (!salesData.Any())
            return new List<FinancePaymentMethodItemDto>();

        // Lấy thông tin credit card type
        var creditCardIds = salesData
            .Where(so => so.CreditCardId.HasValue)
            .Select(so => so.CreditCardId!.Value)
            .Distinct()
            .ToList();

        var creditCards = await context.CreditCards.AsNoTracking()
            .Where(cc => creditCardIds.Contains(cc.CreditCardId))
            .Select(cc => new { cc.CreditCardId, cc.CardType })
            .ToListAsync(cancellationToken);

        var cardDict = creditCards.ToDictionary(cc => cc.CreditCardId, cc => cc.CardType);

        var byPaymentMethod = salesData
            .GroupBy(so => so.CreditCardId.HasValue && cardDict.ContainsKey(so.CreditCardId.Value)
                ? cardDict[so.CreditCardId.Value]
                : "Tiền mặt/Khác")
            .Select(group => new FinancePaymentMethodItemDto
            {
                PaymentMethod = group.Key,
                TotalAmount = group.Sum(so => so.TotalDue),
                OrderCount = group.Count(),
                Percentage = total > 0 ? (group.Sum(so => so.TotalDue) / total) * 100 : 0
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToList();

        return byPaymentMethod;
    }

    private static IReadOnlyList<FinanceCashFlowItemDto> BuildCashFlow(
        List<FinanceSalesOrderSummary> salesData,
        List<FinancePurchaseOrderSummary> purchaseData)
    {
        var cashInByMonth = salesData
            .GroupBy(so => new { so.OrderDate.Year, so.OrderDate.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => g.Sum(so => so.TotalDue)
            );

        var cashOutByMonth = purchaseData
            .GroupBy(po => new { po.OrderDate.Year, po.OrderDate.Month })
            .ToDictionary(
                g => (g.Key.Year, g.Key.Month),
                g => g.Sum(po => po.TotalDue)
            );

        var allMonths = cashInByMonth.Keys.Union(cashOutByMonth.Keys).OrderBy(x => x.Year).ThenBy(x => x.Month);

        return allMonths.Select(month =>
        {
            var cashIn = cashInByMonth.GetValueOrDefault(month, 0);
            var cashOut = cashOutByMonth.GetValueOrDefault(month, 0);
            return new FinanceCashFlowItemDto
            {
                Period = $"{month.Year}-{month.Month:00}",
                Year = month.Year,
                Month = month.Month,
                CashIn = cashIn,
                CashOut = cashOut,
                NetCashFlow = cashIn - cashOut
            };
        }).ToList();
    }

    private async Task<FinanceDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var currencies = await context.Currencies.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new FinanceFilterLookupItemDto(0, x.CurrencyCode + " - " + x.Name))
            .ToListAsync(cancellationToken);

        var territories = await context.SalesTerritories.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new FinanceFilterLookupItemDto(x.TerritoryId, x.Name))
            .ToListAsync(cancellationToken);

        return new FinanceDashboardFilterOptionsDto
        {
            Currencies = currencies,
            Territories = territories
        };
    }
}

// Internal DTOs for optimized queries
internal sealed class FinanceSalesOrderSummary
{
    public int SalesOrderId { get; init; }
    public DateTime OrderDate { get; init; }
    public decimal TotalDue { get; init; }
    public decimal TaxAmt { get; init; }
    public decimal SubTotal { get; init; }
    public int? CurrencyRateId { get; init; }
    public int? CreditCardId { get; init; }
    public int? ShipToAddressId { get; init; }
    public int? TerritoryId { get; init; }
}

internal sealed class FinancePurchaseOrderSummary
{
    public int PurchaseOrderId { get; init; }
    public DateTime OrderDate { get; init; }
    public decimal TotalDue { get; init; }
}
