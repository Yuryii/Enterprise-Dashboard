using CAAdventureWorks.Application.DebtOptimization;
using CAAdventureWorks.Application.DebtOptimization.Commands.OptimizePayment;
using CAAdventureWorks.Application.DebtOptimization.Commands.SendDebtEmail;
using CAAdventureWorks.Application.DebtOptimization.Dto;
using CAAdventureWorks.Application.DebtOptimization.Queries.ComposeDebtEmail;
using CAAdventureWorks.Application.DebtOptimization.Queries.GetPendingDebts;
using CAAdventureWorks.Application.DebtOptimization.Queries.GetVendorScores;
using Microsoft.AspNetCore.Http.HttpResults;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class DebtOptimizationEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/debt-optimization";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/optimize", OptimizePayment)
            .WithName("OptimizePayment")
            .WithTags("Debt Optimization")
            .Produces<OptimizationResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        groupBuilder.MapGet("/debts", GetPendingDebts)
            .WithName("GetPendingDebts")
            .WithTags("Debt Optimization")
            .Produces<PendingDebtsResponseDto>();

        groupBuilder.MapPost("/compose-email", ComposeEmail)
            .WithName("ComposeDebtEmail")
            .WithTags("Debt Optimization")
            .Produces<DebtEmailDto>()
            .ProducesProblem(StatusCodes.Status400BadRequest);

        groupBuilder.MapPost("/send-email", SendEmail)
            .WithName("SendDebtEmail")
            .WithTags("Debt Optimization")
            .Produces<EmailSendResultDto>();

        groupBuilder.MapGet("/vendor-scores", GetVendorScores)
            .WithName("GetVendorScores")
            .WithTags("Debt Optimization")
            .Produces<List<VendorScoreDto>>();
    }

    public static async Task<Ok<OptimizationResponseDto>> OptimizePayment(
        [FromBody] OptimizePaymentRequest request,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender.Send(new OptimizePaymentCommand(request.Budget), ct);
        return TypedResults.Ok(result);
    }

    public static async Task<Ok<PendingDebtsResponseDto>> GetPendingDebts(
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender.Send(new GetPendingDebtsQuery(), ct);
        return TypedResults.Ok(result);
    }

    public static async Task<Ok<DebtEmailDto>> ComposeEmail(
        [FromBody] ComposeEmailRequest request,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender.Send(new ComposeDebtEmailQuery(request.DeferredVendorIds), ct);
        return TypedResults.Ok(result);
    }

    public static async Task<Ok<EmailSendResultDto>> SendEmail(
        [FromBody] EmailSendRequestDto request,
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender.Send(
            new SendDebtEmailCommand(request.Recipients, request.Cc, request.Subject, request.Body),
            ct);
        return TypedResults.Ok(result);
    }

    public static async Task<Ok<List<VendorScoreDto>>> GetVendorScores(
        ISender sender,
        CancellationToken ct)
    {
        var result = await sender.Send(new GetVendorScoresQuery(), ct);
        return TypedResults.Ok(result);
    }
}

public record OptimizePaymentRequest(decimal Budget);
public record ComposeEmailRequest(List<int> DeferredVendorIds);
