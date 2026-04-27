using CAAdventureWorks.Application.Common.Exceptions;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.SalesDataManagement;
using CAAdventureWorks.Domain.Entities;
using CAAdventureWorks.Web.Services;
using Hangfire;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class SalesDataManagementEndpoint : IEndpointGroup
{
    public static string? RoutePrefix => "/api/sales-data-management";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetSalesOrders, "/orders")
            .WithName("GetManagedSalesOrders")
            .WithTags("Sales Data Management");

        groupBuilder.MapGet(GetSalesOrder, "/orders/{id:int}")
            .WithName("GetManagedSalesOrder")
            .WithTags("Sales Data Management");

        groupBuilder.MapPost(CreateSalesOrder, "/orders")
            .WithName("CreateManagedSalesOrder")
            .WithTags("Sales Data Management");

        groupBuilder.MapPut(UpdateSalesOrder, "/orders/{id:int}")
            .WithName("UpdateManagedSalesOrder")
            .WithTags("Sales Data Management");

        groupBuilder.MapDelete(DeleteSalesOrder, "/orders/{id:int}")
            .WithName("DeleteManagedSalesOrder")
            .WithTags("Sales Data Management");

        groupBuilder.MapGet(GetLookups, "/lookups")
            .WithName("GetSalesDataManagementLookups")
            .WithTags("Sales Data Management");

        groupBuilder.MapPost(ImportOrders, "/orders/import")
            .WithName("ImportManagedSalesOrders")
            .DisableAntiforgery()
            .WithTags("Sales Data Management");

        groupBuilder.MapGet(GetImportStatus, "/orders/import/{jobId}")
            .WithName("GetManagedSalesOrderImportStatus")
            .WithTags("Sales Data Management");
    }

    [EndpointSummary("Get paged sales orders for data management")]
    public static async Task<Ok<PagedSalesOrdersDto>> GetSalesOrders(
        int? page,
        int? pageSize,
        string? search,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var result = await SalesDataManagementQueries.GetSalesOrdersAsync(
            context,
            page ?? 1,
            pageSize ?? 10,
            search,
            cancellationToken);

        return TypedResults.Ok(result);
    }

    [EndpointSummary("Get a sales order by id")]
    public static async Task<Results<Ok<SalesOrderDto>, NotFound>> GetSalesOrder(
        int id,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var result = await SalesDataManagementQueries.GetSalesOrderAsync(context, id, cancellationToken);
        return result is null ? TypedResults.NotFound() : TypedResults.Ok(result);
    }

    [EndpointSummary("Create a sales order")]
    public static async Task<Created<SalesOrderDto>> CreateSalesOrder(
        UpsertSalesOrderRequest request,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        ValidateRequest(request);
        await EnsureDetailReferencesValidAsync(request, context, cancellationToken);

        var order = new SalesOrderHeader
        {
            RevisionNumber = 0,
            OrderDate = request.OrderDate,
            DueDate = request.DueDate,
            ShipDate = request.ShipDate,
            Status = request.Status,
            OnlineOrderFlag = request.OnlineOrderFlag,
            PurchaseOrderNumber = request.PurchaseOrderNumber,
            AccountNumber = request.AccountNumber,
            CustomerId = request.CustomerId,
            SalesPersonId = request.SalesPersonId,
            TerritoryId = request.TerritoryId,
            BillToAddressId = request.BillToAddressId,
            ShipToAddressId = request.ShipToAddressId,
            ShipMethodId = request.ShipMethodId,
            SubTotal = CalculateSubTotal(request.Details),
            TaxAmt = request.TaxAmt,
            Freight = request.Freight,
            Comment = request.Comment,
            Rowguid = Guid.NewGuid(),
            ModifiedDate = DateTime.UtcNow
        };

        foreach (var detail in request.Details)
        {
            order.SalesOrderDetails.Add(new SalesOrderDetail
            {
                OrderQty = detail.OrderQty,
                ProductId = detail.ProductId,
                SpecialOfferId = detail.SpecialOfferId,
                UnitPrice = detail.UnitPrice,
                UnitPriceDiscount = detail.UnitPriceDiscount,
                Rowguid = Guid.NewGuid(),
                ModifiedDate = DateTime.UtcNow
            });
        }

        context.SalesOrderHeaders.Add(order);
        await context.SaveChangesAsync(cancellationToken);

        var created = await SalesDataManagementQueries.GetSalesOrderAsync(context, order.SalesOrderId, cancellationToken);
        return TypedResults.Created($"/api/sales-data-management/orders/{order.SalesOrderId}", created!);
    }

    [EndpointSummary("Update a sales order")]
    public static async Task<Results<Ok<SalesOrderDto>, NotFound>> UpdateSalesOrder(
        int id,
        UpsertSalesOrderRequest request,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        ValidateRequest(request);
        await EnsureDetailReferencesValidAsync(request, context, cancellationToken);

        var order = await context.SalesOrderHeaders
            .Include(x => x.SalesOrderDetails)
            .FirstOrDefaultAsync(x => x.SalesOrderId == id, cancellationToken);

        if (order is null)
        {
            return TypedResults.NotFound();
        }

        order.OrderDate = request.OrderDate;
        order.DueDate = request.DueDate;
        order.ShipDate = request.ShipDate;
        order.Status = request.Status;
        order.OnlineOrderFlag = request.OnlineOrderFlag;
        order.PurchaseOrderNumber = request.PurchaseOrderNumber;
        order.AccountNumber = request.AccountNumber;
        order.CustomerId = request.CustomerId;
        order.SalesPersonId = request.SalesPersonId;
        order.TerritoryId = request.TerritoryId;
        order.BillToAddressId = request.BillToAddressId;
        order.ShipToAddressId = request.ShipToAddressId;
        order.ShipMethodId = request.ShipMethodId;
        order.SubTotal = CalculateSubTotal(request.Details);
        order.TaxAmt = request.TaxAmt;
        order.Freight = request.Freight;
        order.Comment = request.Comment;
        order.ModifiedDate = DateTime.UtcNow;

        var requestedIds = request.Details
            .Where(x => x.SalesOrderDetailId.HasValue)
            .Select(x => x.SalesOrderDetailId!.Value)
            .ToHashSet();

        var removedDetails = order.SalesOrderDetails
            .Where(x => !requestedIds.Contains(x.SalesOrderDetailId))
            .ToList();

        context.SalesOrderDetails.RemoveRange(removedDetails);

        foreach (var detailRequest in request.Details)
        {
            var detail = detailRequest.SalesOrderDetailId.HasValue
                ? order.SalesOrderDetails.FirstOrDefault(x => x.SalesOrderDetailId == detailRequest.SalesOrderDetailId.Value)
                : null;

            if (detail is null)
            {
                order.SalesOrderDetails.Add(new SalesOrderDetail
                {
                    OrderQty = detailRequest.OrderQty,
                    ProductId = detailRequest.ProductId,
                    SpecialOfferId = detailRequest.SpecialOfferId,
                    UnitPrice = detailRequest.UnitPrice,
                    UnitPriceDiscount = detailRequest.UnitPriceDiscount,
                    Rowguid = Guid.NewGuid(),
                    ModifiedDate = DateTime.UtcNow
                });

                continue;
            }

            detail.OrderQty = detailRequest.OrderQty;
            detail.ProductId = detailRequest.ProductId;
            detail.SpecialOfferId = detailRequest.SpecialOfferId;
            detail.UnitPrice = detailRequest.UnitPrice;
            detail.UnitPriceDiscount = detailRequest.UnitPriceDiscount;
            detail.ModifiedDate = DateTime.UtcNow;
        }

        await context.SaveChangesAsync(cancellationToken);

        var updated = await SalesDataManagementQueries.GetSalesOrderAsync(context, id, cancellationToken);
        return TypedResults.Ok(updated!);
    }

    [EndpointSummary("Delete a sales order")]
    public static async Task<Results<NoContent, NotFound>> DeleteSalesOrder(
        int id,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var order = await context.SalesOrderHeaders
            .Include(x => x.SalesOrderDetails)
            .FirstOrDefaultAsync(x => x.SalesOrderId == id, cancellationToken);

        if (order is null)
        {
            return TypedResults.NotFound();
        }

        context.SalesOrderDetails.RemoveRange(order.SalesOrderDetails);
        context.SalesOrderHeaders.Remove(order);
        await context.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }

    [EndpointSummary("Get lookup data for sales order CRUD")]
    public static async Task<Ok<SalesOrderLookupsDto>> GetLookups(
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var result = await SalesDataManagementQueries.GetLookupsAsync(context, cancellationToken);
        return TypedResults.Ok(result);
    }

    [EndpointSummary("Enqueue Excel sales order import job")]
    public static async Task<Ok<SalesOrderImportStatusDto>> ImportOrders(
        IFormFile file,
        IBackgroundJobClient backgroundJobs,
        IServiceScopeFactory scopeFactory,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            throw new ValidationException("File Excel không có dữ liệu.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not ".xls" and not ".xlsx" and not ".csv")
        {
            throw new ValidationException("Chỉ hỗ trợ file Excel .xls, .xlsx hoặc .csv.");
        }

        var jobId = Guid.NewGuid().ToString("N");
        var importDirectory = Path.Combine(environment.ContentRootPath, "App_Data", "sales-order-imports");
        Directory.CreateDirectory(importDirectory);
        var filePath = Path.Combine(importDirectory, $"{jobId}{extension}");

        await using (var stream = File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var status = SalesOrderImportJob.CreateStatus(jobId);
        try
        {
            backgroundJobs.Enqueue<SalesOrderImportJob>(job => job.ProcessAsync(jobId, filePath));
        }
        catch
        {
            _ = Task.Run(async () =>
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var job = scope.ServiceProvider.GetRequiredService<SalesOrderImportJob>();
                await job.ProcessAsync(jobId, filePath);
            }, CancellationToken.None);
        }

        return TypedResults.Ok(status);
    }

    [EndpointSummary("Get Excel sales order import job status")]
    public static Results<Ok<SalesOrderImportStatusDto>, NotFound> GetImportStatus(string jobId)
    {
        var status = SalesOrderImportJob.GetStatus(jobId);
        return status is null ? TypedResults.NotFound() : TypedResults.Ok(status);
    }

    private static decimal CalculateSubTotal(IReadOnlyList<UpsertSalesOrderDetailDto> details) =>
        details.Sum(detail => detail.OrderQty * detail.UnitPrice * (1 - detail.UnitPriceDiscount));

    private static async Task EnsureDetailReferencesValidAsync(
        UpsertSalesOrderRequest request,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var requestedPairs = request.Details
            .Select(detail => new { detail.ProductId, detail.SpecialOfferId })
            .Distinct()
            .ToList();

        foreach (var pair in requestedPairs)
        {
            var exists = await context.SpecialOfferProducts
                .AnyAsync(item => item.ProductId == pair.ProductId && item.SpecialOfferId == pair.SpecialOfferId, cancellationToken);

            if (!exists)
            {
                throw new ValidationException($"Sản phẩm #{pair.ProductId} không áp dụng chương trình khuyến mãi #{pair.SpecialOfferId}.");
            }
        }
    }

    private static void ValidateRequest(UpsertSalesOrderRequest request)
    {
        if (request.Details.Count == 0)
        {
            throw new ValidationException("Cần ít nhất một dòng sản phẩm.");
        }

        if (request.DueDate < request.OrderDate)
        {
            throw new ValidationException("Ngày đến hạn không được nhỏ hơn ngày đặt hàng.");
        }

        if (request.Status is < 1 or > 6)
        {
            throw new ValidationException("Trạng thái đơn hàng không hợp lệ.");
        }

        foreach (var detail in request.Details)
        {
            if (detail.OrderQty <= 0)
            {
                throw new ValidationException("Số lượng sản phẩm phải lớn hơn 0.");
            }

            if (detail.UnitPrice < 0 || detail.UnitPriceDiscount < 0 || detail.UnitPriceDiscount >= 1)
            {
                throw new ValidationException("Đơn giá hoặc giảm giá không hợp lệ.");
            }
        }
    }
}
