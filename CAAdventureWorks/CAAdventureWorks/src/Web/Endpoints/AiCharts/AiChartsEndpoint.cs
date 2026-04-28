using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Web.Endpoints.AiCharts;

public sealed class AiChartsEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/ai-charts";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization("Sales");

        groupBuilder.MapGet(GetSavedCharts, "/")
            .WithName("GetSavedCharts")
            .WithTags("AI Charts");

        groupBuilder.MapPost(SaveChart, "/")
            .WithName("SaveChart")
            .WithTags("AI Charts");

        groupBuilder.MapDelete(DeleteChart, "/{chartId:guid}")
            .WithName("DeleteChart")
            .WithTags("AI Charts");
    }

    private static async Task<Ok<List<SavedChartDto>>> GetSavedCharts(
        [FromQuery] string? departmentId,
        IUser user,
        IChatBotDbContext db)
    {
        var userId = user.Id;

        var query = db.SavedCharts
            .Where(c => c.UserId == userId);

        if (!string.IsNullOrWhiteSpace(departmentId))
        {
            query = query.Where(c => c.DepartmentId == departmentId);
        }

        var charts = await query
            .OrderByDescending(c => c.LastUsedAt ?? c.CreatedAt)
            .Select(c => new SavedChartDto
            {
                ChartId = c.ChartId,
                DepartmentId = c.DepartmentId,
                Name = c.Name,
                ChartSpecJson = c.ChartSpecJson,
                CreatedAt = c.CreatedAt,
                LastUsedAt = c.LastUsedAt
            })
            .ToListAsync();

        return TypedResults.Ok(charts);
    }

    private static async Task<CreatedAtRoute<SavedChartDto>> SaveChart(
        [FromBody] SaveChartRequest request,
        IUser user,
        IChatBotDbContext db)
    {
        var userId = user.Id
            ?? throw new InvalidOperationException("User identifier not found.");

        var chart = new SavedChart
        {
            ChartId = Guid.NewGuid(),
            UserId = userId,
            DepartmentId = request.DepartmentId,
            Name = request.Name,
            ChartSpecJson = request.ChartSpecJson,
            CreatedAt = DateTime.UtcNow
        };

        db.SavedCharts.Add(chart);
        await db.SaveChangesAsync();

        var dto = new SavedChartDto
        {
            ChartId = chart.ChartId,
            DepartmentId = chart.DepartmentId,
            Name = chart.Name,
            ChartSpecJson = chart.ChartSpecJson,
            CreatedAt = chart.CreatedAt,
            LastUsedAt = chart.LastUsedAt
        };

        return TypedResults.CreatedAtRoute(dto, "GetSavedCharts");
    }

    private static async Task<NoContent> DeleteChart(
        Guid chartId,
        IUser user,
        IChatBotDbContext db)
    {
        var userId = user.Id
            ?? throw new InvalidOperationException("User identifier not found.");

        var chart = await db.SavedCharts
            .FirstOrDefaultAsync(c => c.ChartId == chartId && c.UserId == userId);

        if (chart is null)
        {
            return TypedResults.NoContent();
        }

        db.SavedCharts.Remove(chart);
        await db.SaveChangesAsync();

        return TypedResults.NoContent();
    }
}

public class SaveChartRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public string ChartSpecJson { get; set; } = null!;

    [Required]
    [StringLength(50)]
    public string DepartmentId { get; set; } = null!;
}

public class SavedChartDto
{
    public Guid ChartId { get; set; }
    public string DepartmentId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ChartSpecJson { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}
