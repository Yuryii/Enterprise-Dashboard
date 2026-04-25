using CAAdventureWorks.Application.ISDashboard.Queries.GetISDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class ISDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/isdashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetISDashboard, "/")
            .WithName("GetISDashboard")
            .WithTags("IS Dashboard");
    }

    [EndpointSummary("Get Information Services dashboard analytics")]
    [EndpointDescription("Returns system health metrics, error logs, database activity, user accounts, password security, and audit trail analytics for the Information Services department dashboard.")]
    public static async Task<Ok<ISDashboardResponseDto>> GetISDashboard(
        DateTime? startDate,
        DateTime? endDate,
        short? departmentId,
        int? errorNumber,
        ISender sender)
    {
        var result = await sender.Send(new GetISDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            DepartmentId: departmentId,
            ErrorNumber: errorNumber));

        return TypedResults.Ok(result);
    }
}
