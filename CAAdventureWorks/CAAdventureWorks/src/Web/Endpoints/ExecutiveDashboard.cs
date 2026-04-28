using System.Text.Json;
using CAAdventureWorks.Application.ChatBot.Services;
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

        groupBuilder.MapPost(GetAiAssessment, "/ai-assessment")
            .WithName("GetExecutiveAiAssessment")
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

    [EndpointSummary("Generate AI assessment for executive PDF report")]
    [EndpointDescription("Uses the configured chatbot AI provider to generate concise Vietnamese executive insights for the current filtered dashboard data.")]
    public static async Task<Ok<ExecutiveAiAssessmentResponse>> GetAiAssessment(
        ExecutiveAiAssessmentRequest request,
        ISemanticKernelService kernelService,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Serialize(request, new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        });

        var prompt = $$"""
        Bạn là chuyên gia phân tích điều hành cho AdventureWorks. Hãy đánh giá dữ liệu dashboard ban điều hành hiện tại để đưa vào báo cáo PDF.

        Yêu cầu trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc rõ ràng:
        - Viết đúng 1 đoạn "Tổng quan AI" tối đa 3 câu.
        - Viết đúng 7 dòng đánh giá, tương ứng các mục:
          01. Xu hướng doanh thu, chi mua và biên vận hành
          02. Doanh thu theo vùng
          03. Top nhân viên kinh doanh
          04. Nhân sự theo phòng ban
          05. Top nhà cung cấp theo chi mua
          06. Tỷ lệ nhận hàng nhà cung cấp
          07. Hiệu suất sản xuất theo ngành hàng
        - Mỗi dòng đánh giá chỉ 1 câu, ưu tiên nhận định hành động/dự báo/rủi ro.
        - Không dùng markdown table, không bịa số ngoài dữ liệu.

        Dữ liệu dashboard JSON:
        {{payload}}
        """;

        var aiResponse = await kernelService.GetResponseAsync("executive", "executive-pdf", prompt, cancellationToken);
        return TypedResults.Ok(new ExecutiveAiAssessmentResponse(aiResponse.Content));
    }
}

public sealed record ExecutiveAiAssessmentRequest(
    ExecutiveDashboardResponseDto Dashboard,
    object? Filters,
    string GeneratedAt);

public sealed record ExecutiveAiAssessmentResponse(string Content);
