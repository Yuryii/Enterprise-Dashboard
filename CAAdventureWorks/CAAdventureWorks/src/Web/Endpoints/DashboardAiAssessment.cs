using System.Text.Json;
using CAAdventureWorks.Application.ChatBot.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public sealed class DashboardAiAssessmentEndpoint : IEndpointGroup
{
    public static string RoutePrefix => "/api/dashboard-ai-assessment";

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(GetAiAssessment, "/")
            .WithName("GetDashboardAiAssessment")
            .WithTags("Dashboard AI Assessment");
    }

    [EndpointSummary("Generate AI assessment for dashboard PDF report")]
    public static async Task<Ok<DashboardAiAssessmentResponse>> GetAiAssessment(
        DashboardAiAssessmentRequest request,
        ISemanticKernelService kernelService,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        });

        var prompt = $$"""
        Bạn là chuyên gia phân tích dữ liệu doanh nghiệp AdventureWorks. Hãy đánh giá dữ liệu dashboard hiện tại để đưa vào báo cáo PDF.

        Yêu cầu trả lời bằng tiếng Việt, ngắn gọn, có tính quản trị:
        - 1 dòng tổng quan về sức khỏe phòng ban.
        - 4 đến 6 nhận định chính dựa trên KPI, bộ lọc và các bảng/section hiện có.
        - Nếu thấy rủi ro hoặc điểm cần tối ưu, nêu hành động đề xuất cụ thể.
        - Không bịa số liệu ngoài JSON, không nhắc đến việc bạn là AI, không dùng markdown bảng.
        - Mỗi ý nên ngắn, rõ, phù hợp đưa trực tiếp vào PDF.

        Phòng ban: {{request.Title}}
        Mã phòng ban: {{request.DepartmentId}}
        Thời điểm xuất: {{request.GeneratedAt}}

        Dữ liệu dashboard JSON:
        {{payload}}
        """;

        var aiResponse = await kernelService.GetResponseAsync("dashboard-report", $"{request.DepartmentId}-pdf", prompt, cancellationToken);
        return TypedResults.Ok(new DashboardAiAssessmentResponse(aiResponse.Content));
    }
}

public sealed record DashboardAiAssessmentRequest(
    string DepartmentId,
    string Title,
    object Dashboard,
    object? Filters,
    object? Sections,
    string GeneratedAt);

public sealed record DashboardAiAssessmentResponse(string Content);
