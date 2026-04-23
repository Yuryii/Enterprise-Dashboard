using CAAdventureWorks.Application.PurchasingDashboard.Queries.GetPurchasingDashboard;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class PurchasingDashboardEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/purchasingdashboard";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetPurchasingDashboard, "/")
            .WithName("GetPurchasingDashboard")
            .WithTags("Purchasing Dashboard");
    }

    [EndpointSummary("Get purchasing dashboard analytics")]
    [EndpointDescription("Returns KPI overview, spend trend, order status, vendor, product, delivery rate, lead time and region analytics for the Purchasing department dashboard.")]
    public static async Task<Ok<PurchasingDashboardResponseDto>> GetPurchasingDashboard(
        DateTime? startDate,
        DateTime? endDate,
        int? vendorId,
        byte? status,
        int? shipMethodId,
        int? productId,
        bool? preferredVendorOnly,
        bool? activeVendorOnly,
        ISender sender)
    {
        var result = await sender.Send(new GetPurchasingDashboardQuery(
            StartDate: startDate,
            EndDate: endDate,
            VendorId: vendorId,
            Status: status,
            ShipMethodId: shipMethodId,
            ProductId: productId,
            PreferredVendorOnly: preferredVendorOnly,
            ActiveVendorOnly: activeVendorOnly));

        return TypedResults.Ok(result);
    }
}
