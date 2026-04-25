using CAAdventureWorks.Application.FinanceDashboard.Queries.GetFinanceDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class FinanceDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/financedashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetFinanceDashboard, "/")
            .WithName("GetFinanceDashboard")
            .WithTags("Finance Dashboard");
    }

    [EndpointSummary("Get finance dashboard analytics")]
    [EndpointDescription("Returns financial overview, revenue/expense trends, profit analysis, tax breakdown, currency distribution, payment methods, and cash flow for the Finance department dashboard.")]
    public static async Task<Ok<FinanceDashboardResponseDto>> GetFinanceDashboard(
        DateTime? startDate,
        DateTime? endDate,
        string? currencyCode,
        int? territoryId,
        ISender sender)
    {
        var result = await sender.Send(new GetFinanceDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            CurrencyCode: currencyCode,
            TerritoryId: territoryId));

        return TypedResults.Ok(result);
    }
}
