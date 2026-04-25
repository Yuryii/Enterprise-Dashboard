using CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionControlExceptions;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class ProductionControlExceptionsEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/productiondashboard/exceptions";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetProductionControlExceptions, "/")
            .WithName("GetProductionControlExceptions")
            .WithTags("Production Control Exceptions");
    }

    [EndpointSummary("Get production control exception analytics")]
    [EndpointDescription("Returns exception-focused analytics for Production Control including open work orders, delayed work orders, high scrap work orders and safety stock alerts.")]
    public static async Task<Ok<ProductionControlExceptionsResponseDto>> GetProductionControlExceptions(
        DateTime? startDate,
        DateTime? endDate,
        int? productId,
        int? productCategoryId,
        short? locationId,
        short? scrapReasonId,
        bool? makeOnly,
        bool? finishedGoodsOnly,
        bool? openOnly,
        bool? delayedOnly,
        bool? safetyStockOnly,
        ISender sender)
    {
        var result = await sender.Send(new GetProductionControlExceptionsQuery(
            StartDate: startDate,
            EndDate: endDate,
            ProductId: productId,
            ProductCategoryId: productCategoryId,
            LocationId: locationId,
            ScrapReasonId: scrapReasonId,
            MakeOnly: makeOnly,
            FinishedGoodsOnly: finishedGoodsOnly,
            OpenOnly: openOnly,
            DelayedOnly: delayedOnly,
            SafetyStockOnly: safetyStockOnly));

        return TypedResults.Ok(result);
    }
}
