using CAAdventureWorks.Application.QualityAssuranceDashboard.Queries.GetQualityAssuranceDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class QualityAssuranceDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/qualityassurancedashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetQualityAssuranceDashboard, "/")
            .WithName("GetQualityAssuranceDashboard")
            .WithTags("Quality Assurance Dashboard");
    }

    [EndpointSummary("Get quality assurance dashboard analytics")]
    [EndpointDescription("Returns quality assurance KPI overview, defect trends, scrap reasons, defective products, production locations, vendor reject rates and inspector headcount analytics.")]
    public static async Task<Ok<QualityAssuranceDashboardResponseDto>> GetQualityAssuranceDashboard(
        DateTime? startDate,
        DateTime? endDate,
        short? scrapReasonId,
        int? productCategoryId,
        short? locationId,
        int? vendorId,
        bool? currentInspectorsOnly,
        ISender sender)
    {
        var result = await sender.Send(new GetQualityAssuranceDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            ScrapReasonId: scrapReasonId,
            ProductCategoryId: productCategoryId,
            LocationId: locationId,
            VendorId: vendorId,
            CurrentInspectorsOnly: currentInspectorsOnly));

        return TypedResults.Ok(result);
    }
}
