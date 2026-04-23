using CAAdventureWorks.Application.SalesDashboard.Queries.GetSalesDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class SalesDashboardEndpoint : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization();

        groupBuilder.MapGet(GetSalesDashboard, "/")
            .WithName("GetSalesDashboard")
            .WithTags("Sales Dashboard");
    }

    [EndpointSummary("Get sales dashboard analytics")]
    [EndpointDescription("Returns KPI overview, trend, territory, salesperson, product mix, customer segment, quota, shipping and sales reason analytics for the Sales department dashboard.")]
    public static async Task<Ok<SalesDashboardResponseDto>> GetSalesDashboard(
        DateTime? startDate,
        DateTime? endDate,
        int? territoryId,
        int? salesPersonId,
        int? productCategoryId,
        bool? onlineOrderFlag,
        ISender sender)
    {
        var result = await sender.Send(new GetSalesDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            TerritoryId: territoryId,
            SalesPersonId: salesPersonId,
            ProductCategoryId: productCategoryId,
            OnlineOrderFlag: onlineOrderFlag));

        return TypedResults.Ok(result);
    }
}
