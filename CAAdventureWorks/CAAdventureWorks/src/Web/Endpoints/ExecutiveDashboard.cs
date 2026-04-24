using CAAdventureWorks.Application.ExecutiveDashboard.Queries.GetExecutiveDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class ExecutiveDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/executivedashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetExecutiveDashboard, "/")
            .WithName("GetExecutiveDashboard")
            .WithTags("Executive Dashboard");
    }

    [EndpointSummary("Get executive dashboard analytics")]
    [EndpointDescription("Returns cross-functional KPI overview, revenue versus spend trend, territory revenue, top sales people, headcount, top vendors and production analytics for the Executive dashboard.")]
    public static async Task<Ok<ExecutiveDashboardResponseDto>> GetExecutiveDashboard(
        DateTime? startDate,
        DateTime? endDate,
        int? territoryId,
        int? salesPersonId,
        int? vendorId,
        short? departmentId,
        int? productCategoryId,
        bool? currentEmployeesOnly,
        ISender sender)
    {
        var result = await sender.Send(new GetExecutiveDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            TerritoryId: territoryId,
            SalesPersonId: salesPersonId,
            VendorId: vendorId,
            DepartmentId: departmentId,
            ProductCategoryId: productCategoryId,
            CurrentEmployeesOnly: currentEmployeesOnly));

        return TypedResults.Ok(result);
    }
}
