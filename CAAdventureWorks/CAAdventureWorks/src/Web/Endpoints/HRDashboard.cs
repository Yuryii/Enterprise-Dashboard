using CAAdventureWorks.Application.HRDashboard.Queries.GetHRDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class HRDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/hrdashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetHRDashboard, "/")
            .WithName("GetHRDashboard")
            .WithTags("HR Dashboard");
    }

    [EndpointSummary("Get HR dashboard analytics")]
    [EndpointDescription("Returns KPI overview, employee trend, department distribution, job titles, gender distribution, pay rates, tenure, and shift analytics for the HR department dashboard.")]
    public static async Task<Ok<HRDashboardResponseDto>> GetHRDashboard(
        DateTime? startDate,
        DateTime? endDate,
        short? departmentId,
        string? gender,
        bool? salariedOnly,
        bool? activeOnly,
        ISender sender)
    {
        var result = await sender.Send(new GetHRDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            DepartmentId: departmentId,
            Gender: gender,
            SalariedOnly: salariedOnly,
            ActiveOnly: activeOnly));

        return TypedResults.Ok(result);
    }
}
