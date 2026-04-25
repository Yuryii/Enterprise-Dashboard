using CAAdventureWorks.Application.ToolDesignDashboard.Queries.GetToolDesignDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class ToolDesignDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/tooldesigndashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetToolDesignDashboard, "/")
            .WithName("GetToolDesignDashboard")
            .WithTags("Tool Design Dashboard");
    }

    [EndpointSummary("Get tool design dashboard analytics")]
    [EndpointDescription("Returns model coverage, instruction readiness, complexity, routing deployment, BOM, inventory and vendor dependency analytics for the Tool Design dashboard.")]
    public static async Task<Ok<ToolDesignDashboardResponseDto>> GetToolDesignDashboard(
        int? productModelId,
        int? productId,
        int? productCategoryId,
        short? locationId,
        int? vendorId,
        bool? makeOnly,
        bool? finishedGoodsOnly,
        int? minDaysToManufacture,
        decimal? minStandardCost,
        ISender sender)
    {
        var result = await sender.Send(new GetToolDesignDashboardQuery(
            ProductModelId: productModelId,
            ProductId: productId,
            ProductCategoryId: productCategoryId,
            LocationId: locationId,
            VendorId: vendorId,
            MakeOnly: makeOnly,
            FinishedGoodsOnly: finishedGoodsOnly,
            MinDaysToManufacture: minDaysToManufacture,
            MinStandardCost: minStandardCost));

        return TypedResults.Ok(result);
    }
}
