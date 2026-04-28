using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.SalesDataManagement;

public sealed record SalesOrderListItemDto(
    int SalesOrderId,
    string SalesOrderNumber,
    DateTime OrderDate,
    DateTime DueDate,
    DateTime? ShipDate,
    byte Status,
    bool OnlineOrderFlag,
    int CustomerId,
    string CustomerName,
    int? SalesPersonId,
    string? SalesPersonName,
    int? TerritoryId,
    decimal SubTotal,
    decimal TaxAmt,
    decimal Freight,
    decimal TotalDue,
    int DetailCount);

public sealed record PagedSalesOrdersDto(
    IReadOnlyList<SalesOrderListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record SalesOrderDetailDto(
    int SalesOrderDetailId,
    short OrderQty,
    int ProductId,
    string ProductName,
    int SpecialOfferId,
    decimal UnitPrice,
    decimal UnitPriceDiscount,
    decimal LineTotal);

public sealed record SalesOrderDto(
    int SalesOrderId,
    string SalesOrderNumber,
    DateTime OrderDate,
    DateTime DueDate,
    DateTime? ShipDate,
    byte Status,
    bool OnlineOrderFlag,
    string? PurchaseOrderNumber,
    string? AccountNumber,
    int CustomerId,
    string CustomerName,
    int? SalesPersonId,
    string? SalesPersonName,
    int? TerritoryId,
    int BillToAddressId,
    int ShipToAddressId,
    int ShipMethodId,
    decimal SubTotal,
    decimal TaxAmt,
    decimal Freight,
    decimal TotalDue,
    string? Comment,
    IReadOnlyList<SalesOrderDetailDto> Details);

public sealed record UpsertSalesOrderDetailDto(
    int? SalesOrderDetailId,
    short OrderQty,
    int ProductId,
    int SpecialOfferId,
    decimal UnitPrice,
    decimal UnitPriceDiscount);

public sealed record UpsertSalesOrderRequest(
    DateTime OrderDate,
    DateTime DueDate,
    DateTime? ShipDate,
    byte Status,
    bool OnlineOrderFlag,
    string? PurchaseOrderNumber,
    string? AccountNumber,
    int CustomerId,
    int? SalesPersonId,
    int? TerritoryId,
    int BillToAddressId,
    int ShipToAddressId,
    int ShipMethodId,
    decimal TaxAmt,
    decimal Freight,
    string? Comment,
    IReadOnlyList<UpsertSalesOrderDetailDto> Details);

public sealed record LookupItemDto(int Id, string Name);

public sealed record SalesOrderLookupsDto(
    IReadOnlyList<LookupItemDto> Customers,
    IReadOnlyList<LookupItemDto> SalesPeople,
    IReadOnlyList<LookupItemDto> Products,
    IReadOnlyList<LookupItemDto> ShipMethods,
    IReadOnlyList<LookupItemDto> Territories,
    IReadOnlyList<LookupItemDto> Addresses,
    IReadOnlyList<LookupItemDto> SpecialOffers);

public static class SalesDataManagementQueries
{
    public static async Task<PagedSalesOrdersDto> GetSalesOrdersAsync(
        IApplicationDbContext context,
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 100);

        var query = context.SalesOrderHeaders.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(order =>
                order.SalesOrderNumber.Contains(keyword) ||
                (order.PurchaseOrderNumber != null && order.PurchaseOrderNumber.Contains(keyword)) ||
                (order.Comment != null && order.Comment.Contains(keyword)) ||
                order.Customer.AccountNumber.Contains(keyword) ||
                (order.Customer.Person != null &&
                    (order.Customer.Person.FirstName + " " + order.Customer.Person.LastName).Contains(keyword)) ||
                (order.Customer.Store != null && order.Customer.Store.Name.Contains(keyword)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        var rows = await query
            .OrderByDescending(order => order.ModifiedDate)
            .ThenByDescending(order => order.SalesOrderId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(order => new
            {
                order.SalesOrderId,
                order.SalesOrderNumber,
                order.PurchaseOrderNumber,
                order.OrderDate,
                order.DueDate,
                order.ShipDate,
                order.Status,
                order.OnlineOrderFlag,
                order.CustomerId,
                CustomerName = order.Customer.Person != null
                    ? order.Customer.Person.FirstName + " " + order.Customer.Person.LastName
                    : order.Customer.Store != null
                        ? order.Customer.Store.Name
                        : order.Customer.AccountNumber,
                order.SalesPersonId,
                SalesPersonName = order.SalesPerson != null
                    ? order.SalesPerson.BusinessEntity.BusinessEntity.FirstName + " " + order.SalesPerson.BusinessEntity.BusinessEntity.LastName
                    : null,
                order.TerritoryId,
                order.SubTotal,
                order.TaxAmt,
                order.Freight,
                order.TotalDue,
                order.Comment,
                DetailCount = order.SalesOrderDetails.Count
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(order => new SalesOrderListItemDto(
                order.SalesOrderId,
                string.IsNullOrWhiteSpace(order.PurchaseOrderNumber) ? order.SalesOrderNumber : order.PurchaseOrderNumber,
                order.OrderDate,
                order.DueDate,
                order.ShipDate,
                order.Status,
                order.OnlineOrderFlag,
                order.CustomerId,
                ExtractImportedCustomerName(order.Comment) ?? order.CustomerName,
                order.SalesPersonId,
                order.SalesPersonName,
                order.TerritoryId,
                order.SubTotal,
                order.TaxAmt,
                order.Freight,
                order.TotalDue,
                order.DetailCount))
            .ToList();

        return new PagedSalesOrdersDto(items, page, pageSize, totalCount, totalPages);
    }

    public static async Task<SalesOrderDto?> GetSalesOrderAsync(
        IApplicationDbContext context,
        int id,
        CancellationToken cancellationToken)
    {
        var order = await context.SalesOrderHeaders
            .AsNoTracking()
            .Where(order => order.SalesOrderId == id)
            .Select(order => new
            {
                order.SalesOrderId,
                order.SalesOrderNumber,
                order.PurchaseOrderNumber,
                order.AccountNumber,
                order.OrderDate,
                order.DueDate,
                order.ShipDate,
                order.Status,
                order.OnlineOrderFlag,
                order.CustomerId,
                CustomerName = order.Customer.Person != null
                    ? order.Customer.Person.FirstName + " " + order.Customer.Person.LastName
                    : order.Customer.Store != null
                    ? order.Customer.Store.Name
                    : order.Customer.AccountNumber,
                order.SalesPersonId,
                SalesPersonName = order.SalesPerson != null
                    ? order.SalesPerson.BusinessEntity.BusinessEntity.FirstName + " " + order.SalesPerson.BusinessEntity.BusinessEntity.LastName
                    : null,
                order.TerritoryId,
                order.BillToAddressId,
                order.ShipToAddressId,
                order.ShipMethodId,
                order.SubTotal,
                order.TaxAmt,
                order.Freight,
                order.TotalDue,
                order.Comment,
                Details = order.SalesOrderDetails
                    .OrderBy(detail => detail.SalesOrderDetailId)
                    .Select(detail => new SalesOrderDetailDto(
                        detail.SalesOrderDetailId,
                        detail.OrderQty,
                        detail.ProductId,
                        detail.SpecialOfferProduct.Product.Name,
                        detail.SpecialOfferId,
                        detail.UnitPrice,
                        detail.UnitPriceDiscount,
                        detail.LineTotal))
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return order is null
            ? null
            : new SalesOrderDto(
                order.SalesOrderId,
                string.IsNullOrWhiteSpace(order.PurchaseOrderNumber) ? order.SalesOrderNumber : order.PurchaseOrderNumber,
                order.OrderDate,
                order.DueDate,
                order.ShipDate,
                order.Status,
                order.OnlineOrderFlag,
                order.PurchaseOrderNumber,
                order.AccountNumber,
                order.CustomerId,
                ExtractImportedCustomerName(order.Comment) ?? order.CustomerName,
                order.SalesPersonId,
                order.SalesPersonName,
                order.TerritoryId,
                order.BillToAddressId,
                order.ShipToAddressId,
                order.ShipMethodId,
                order.SubTotal,
                order.TaxAmt,
                order.Freight,
                order.TotalDue,
                order.Comment,
                order.Details);
    }

    private static string? ExtractImportedCustomerName(string? comment)
    {
        const string marker = "Import Excel | Khách hàng: ";
        const string nextMarker = " | Ghi chú:";

        if (string.IsNullOrWhiteSpace(comment) || !comment.StartsWith(marker, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var value = comment[marker.Length..];
        var endIndex = value.IndexOf(nextMarker, StringComparison.OrdinalIgnoreCase);
        var customerName = endIndex >= 0 ? value[..endIndex] : value;
        return string.IsNullOrWhiteSpace(customerName) ? null : customerName.Trim();
    }

    public static async Task<SalesOrderLookupsDto> GetLookupsAsync(
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var customers = await context.Customers
            .AsNoTracking()
            .OrderBy(customer => customer.CustomerId)
            .Take(200)
            .Select(customer => new LookupItemDto(
                customer.CustomerId,
                customer.Person != null
                    ? customer.Person.FirstName + " " + customer.Person.LastName
                    : customer.Store != null
                        ? customer.Store.Name
                        : customer.AccountNumber))
            .ToListAsync(cancellationToken);

        var salesPeople = await context.SalesPeople
            .AsNoTracking()
            .OrderBy(person => person.BusinessEntityId)
            .Select(person => new LookupItemDto(
                person.BusinessEntityId,
                person.BusinessEntity.BusinessEntity.FirstName + " " + person.BusinessEntity.BusinessEntity.LastName))
            .ToListAsync(cancellationToken);

        var products = await context.Products
            .AsNoTracking()
            .Where(product => product.FinishedGoodsFlag)
            .OrderBy(product => product.Name)
            .Take(300)
            .Select(product => new LookupItemDto(product.ProductId, product.Name))
            .ToListAsync(cancellationToken);

        var shipMethods = await context.ShipMethods
            .AsNoTracking()
            .OrderBy(method => method.Name)
            .Select(method => new LookupItemDto(method.ShipMethodId, method.Name))
            .ToListAsync(cancellationToken);

        var territories = await context.SalesTerritories
            .AsNoTracking()
            .OrderBy(territory => territory.Name)
            .Select(territory => new LookupItemDto(territory.TerritoryId, territory.Name))
            .ToListAsync(cancellationToken);

        var addresses = await context.Addresses
            .AsNoTracking()
            .OrderBy(address => address.AddressId)
            .Take(300)
            .Select(address => new LookupItemDto(address.AddressId, address.AddressLine1 + ", " + address.City))
            .ToListAsync(cancellationToken);

        var specialOffers = await context.SpecialOffers
            .AsNoTracking()
            .OrderBy(offer => offer.SpecialOfferId)
            .Select(offer => new LookupItemDto(offer.SpecialOfferId, offer.Description))
            .ToListAsync(cancellationToken);

        return new SalesOrderLookupsDto(customers, salesPeople, products, shipMethods, territories, addresses, specialOffers);
    }
}
