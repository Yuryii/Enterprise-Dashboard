using CAAdventureWorks.Application.ProductionDashboard.Queries.GetProductionDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class ProductionDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/productiondashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetProductionDashboard, "/")
            .WithName("GetProductionDashboard")
            .WithTags("Production Dashboard");
    }

    [EndpointSummary("Get production dashboard analytics")]
    [EndpointDescription("Returns production KPI overview, work order trends, output, product, category, location cost, inventory, BOM and production transaction analytics.")]
    public static async Task<Ok<ProductionDashboardResponseDto>> GetProductionDashboard(
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
        var result = await sender.Send(new GetProductionDashboardQuery(
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
