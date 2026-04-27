using CAAdventureWorks.Application.Alerts;
using CAAdventureWorks.Application.Alerts.Commands.ActivateNow;
using CAAdventureWorks.Application.Alerts.Commands.CreateAlertConfiguration;
using CAAdventureWorks.Application.Alerts.Commands.DeleteAlertConfiguration;
using CAAdventureWorks.Application.Alerts.Commands.UpdateAlertConfiguration;
using CAAdventureWorks.Application.Alerts.Queries.DismissAlert;
using CAAdventureWorks.Application.Alerts.Queries.GetAlertConfigurations;
using CAAdventureWorks.Application.Alerts.Queries.GetAlertDefinitions;
using CAAdventureWorks.Application.Alerts.Queries.GetAlertHistory;
using CAAdventureWorks.Application.Alerts.Queries.GetUnreadAlerts;
using CAAdventureWorks.Application.Alerts.Queries.GetUnreadCount;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints.Alerts;

public sealed class AlertsEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/alerts";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization("Alerts");

        groupBuilder.MapGet(GetAlertDefinitions, "/definitions")
            .WithName("GetAlertDefinitions")
            .WithTags("Alerts");

        groupBuilder.MapGet(GetConfigurations, "/configurations")
            .WithName("GetAlertConfigurations")
            .WithTags("Alerts");

        groupBuilder.MapPost(CreateConfiguration, "/configurations")
            .WithName("CreateAlertConfiguration")
            .WithTags("Alerts");

        groupBuilder.MapPut(UpdateConfiguration, "/configurations/{id}")
            .WithName("UpdateAlertConfiguration")
            .WithTags("Alerts");

        groupBuilder.MapDelete(DeleteConfiguration, "/configurations/{id}")
            .WithName("DeleteAlertConfiguration")
            .WithTags("Alerts");

        groupBuilder.MapPost(ActivateNow, "/configurations/{id}/activate")
            .WithName("ActivateAlertNow")
            .WithTags("Alerts");

        groupBuilder.MapGet(GetHistory, "/history")
            .WithName("GetAlertHistory")
            .WithTags("Alerts");

        groupBuilder.MapGet(GetUnreadCount, "/unread-count")
            .WithName("GetUnreadAlertCount")
            .WithTags("Alerts");

        groupBuilder.MapGet(GetUnread, "/unread")
            .WithName("GetUnreadAlerts")
            .WithTags("Alerts");

        groupBuilder.MapPut(DismissAlert, "/history/{id}/dismiss")
            .WithName("DismissAlert")
            .WithTags("Alerts");
    }

    private static async Task<Ok<IReadOnlyList<AlertDefinitionDto>>> GetAlertDefinitions(
        IUser user,
        ISender sender)
    {
        var departmentCode = GetDepartmentFromRoles(user.Roles);
        return TypedResults.Ok(await sender.Send(new GetAlertDefinitionsQuery(departmentCode)));
    }

    private static string? GetDepartmentFromRoles(List<string>? roles)
    {
        if (roles is null or { Count: 0 })
            return null;

        foreach (var role in roles)
        {
            var dept = roleDepartmentMap.GetValueOrDefault(role);
            if (dept is not null)
                return dept;
        }

        return null;
    }

    private static readonly Dictionary<string, string> roleDepartmentMap = new()
    {
        ["Sales"] = "Sales",
        ["Sales-and-Marketing"] = "Sales",
        ["HumanResources"] = "HumanResources",
        ["Executive-General-And-Administration-Manager"] = "HumanResources",
        ["Finance"] = "Finance",
        ["Production"] = "Production",
        ["Manufacturing"] = "Production",
        ["Production-Control"] = "ProductionControl",
        ["Purchasing"] = "Purchasing",
        ["Marketing"] = "Marketing",
        ["Quality-Assurance"] = "QualityAssurance",
        ["Quality-Assurance-Manager"] = "QualityAssurance",
        ["Document-Control"] = "DocumentControl",
        ["Engineering"] = "Engineering",
        ["Tool-Design"] = "ToolDesign",
        ["Shipping-and-Receiving"] = "ShippingAndReceiving",
        ["Facilities"] = "Facilities",
        ["Facilities-And-Maintenance"] = "Facilities",
        ["Information-Services"] = "InformationServices",
        ["Research-and-Development"] = "Engineering",
        ["Executive"] = "Executive",
    };

    private static async Task<Ok<IReadOnlyList<AlertConfigurationDto>>> GetConfigurations(
        IUser user,
        ISender sender)
    {
        var userId = user.Id;
        return TypedResults.Ok(await sender.Send(new GetAlertConfigurationsQuery(userId)));
    }

    private static async Task<CreatedAtRoute<AlertConfigurationDto>> CreateConfiguration(
        CreateAlertConfigurationCommand command,
        ISender sender) =>
        TypedResults.CreatedAtRoute(
            await sender.Send(command),
            "GetAlertConfigurations");

    private static async Task<Ok<AlertConfigurationDto>> UpdateConfiguration(
        int id,
        UpdateAlertConfigurationCommand command,
        ISender sender)
    {
        return TypedResults.Ok(await sender.Send(command with { Id = id }));
    }

    private static async Task<NoContent> DeleteConfiguration(
        int id,
        ISender sender)
    {
        await sender.Send(new DeleteAlertConfigurationCommand(id));
        return TypedResults.NoContent();
    }

    private static async Task<Ok<AlertHistoryDto>> ActivateNow(
        int id,
        ISender sender) =>
        TypedResults.Ok(await sender.Send(new ActivateNowCommand(id)));

    private static async Task<Ok<AlertHistoryListDto>> GetHistory(
        int? page,
        int? pageSize,
        IUser user,
        ISender sender) =>
        TypedResults.Ok(await sender.Send(new GetAlertHistoryQuery(user.Id, page ?? 1, pageSize ?? 20)));

    private static async Task<Ok<int>> GetUnreadCount(
        IUser user,
        ISender sender) =>
        TypedResults.Ok(await sender.Send(new GetUnreadCountQuery(user.Id)));

    private static async Task<Ok<IReadOnlyList<AlertHistoryDto>>> GetUnread(
        int? maxCount,
        IUser user,
        ISender sender) =>
        TypedResults.Ok(await sender.Send(new GetUnreadAlertsQuery(user.Id, maxCount ?? 10)));

    private static async Task<NoContent> DismissAlert(
        int id,
        bool? isRead,
        ISender sender)
    {
        await sender.Send(new DismissAlertQuery(id, isRead ?? null));
        return TypedResults.NoContent();
    }
}
