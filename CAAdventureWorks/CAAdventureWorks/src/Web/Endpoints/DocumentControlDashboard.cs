using CAAdventureWorks.Application.DocumentControlDashboard.Queries.GetDocumentControlDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class DocumentControlDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/documentcontroldashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetDocumentControlDashboard, "/")
            .WithName("GetDocumentControlDashboard")
            .WithTags("Document Control Dashboard");
    }

    [EndpointSummary("Get document control dashboard analytics")]
    [EndpointDescription("Returns document overview, status distribution, file type analysis, top products with documents, document owners, recent revisions, pending approvals, and products without documents for the Document Control dashboard.")]
    public static async Task<Ok<DocumentControlDashboardResponseDto>> GetDocumentControlDashboard(
        DateTime? startDate,
        DateTime? endDate,
        byte? status,
        string? fileExtension,
        ISender sender)
    {
        var result = await sender.Send(new GetDocumentControlDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            Status: status,
            FileExtension: fileExtension));

        return TypedResults.Ok(result);
    }
}
