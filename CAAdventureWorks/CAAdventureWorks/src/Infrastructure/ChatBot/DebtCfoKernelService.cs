using System.Net.Http;
using System.Text;
using CAAdventureWorks.Application.ChatBot.Models;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.DebtOptimization;
using CAAdventureWorks.Application.DebtOptimization.Dto;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace CAAdventureWorks.Infrastructure.ChatBot;

public sealed class DebtCfoKernelService : IDebtCfoKernelService
{
    private readonly Kernel _kernel;
    private readonly IChatCompletionService _chatCompletion;
    private readonly ILogger<DebtCfoKernelService> _logger;

    private const string SystemPrompt = """
        Bạn là Giám đốc Tài Chính (CFO) của Công ty TNHH AdventureWorks.
        Công ty đang trong giai đoạn khủng hoảng dòng tiền tạm thời vào giữa Quý.
        Vì lý do khách quan (chờ dòng tiền từ đợt tất toán cuối Quý),
        công ty xin phép gia hạn thanh toán công nợ thêm 15 ngày cho các nhà cung cấp bị ưu tiên hoãn.

        Nhiệm vụ của bạn: Viết một email ngoại giao bằng tiếng Việt, thể hiện sự trân trọng và chuyên nghiệp.
        Email phải:
        - Gửi cho các nhà cung cấp bị chậm thanh toán trong danh sách được cung cấp
        - Giải thích ngắn gọn, chân thành, chuyên nghiệp lý do chậm thanh toán
        - Xin gia hạn 15 ngày cụ thể
        - Đảm bảo không làm tổn thương hoặc sứt mẻ mối quan hệ đối tác lâu dài
        - Kèm lời cảm ơn sự thấu hiểu và đồng hành
        - Nêu rõ công ty cam kết thanh toán đầy đủ theo đúng hợp đồng
        - Đề cập đến uy tín và lịch sử hợp tác tốt đẹp giữa hai bên

        Format trả lời CHÍNH XÁC như sau (không thêm hay bớt):
        SUBJECT: <tiêu đề email ngắn gọn, chuyên nghiệp>
        TO: <danh sách email của các vendor bị hoãn, comma-separated, mỗi email một dòng>
        CC: cfo@adventureworks.com
        BODY:
        <nội dung email bắt đầu ngay sau dòng BODY:, không có dòng trống>
        """;

    public DebtCfoKernelService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<DebtCfoKernelService> logger)
    {
        _logger = logger;

        var botConfig = configuration.GetSection("ChatBot").Get<ChatBotConfig>()
            ?? throw new InvalidOperationException("ChatBot configuration not found.");

        var kernelBuilder = Kernel.CreateBuilder();

        kernelBuilder.AddOpenAIChatCompletion(
            modelId: botConfig.Model,
            apiKey: botConfig.ApiKey,
            endpoint: new Uri(botConfig.Endpoint));

        _kernel = kernelBuilder.Build();

        _chatCompletion = _kernel.GetRequiredService<IChatCompletionService>();
    }

    public async Task<DebtEmailDto> ComposeDeferralEmailAsync(
        List<DebtItemDto> deferredDebts,
        CancellationToken cancellationToken = default)
    {
        if (deferredDebts.Count == 0)
        {
            return new DebtEmailDto(
                Subject: "Thư xin gia hạn công nợ - Qúy II/2026",
                Recipients: [],
                Cc: ["cfo@adventureworks.com"],
                Body: "(Không có nhà cung cấp nào bị hoãn.)",
                GeneratedBy: "AI-CFO"
            );
        }

        var vendorList = string.Join("\n", deferredDebts.Select(d =>
            $"- {d.VendorName} ({d.InvoiceNumber}): {d.Amount:N0} VNĐ, Điểm quan trọng: {d.ImportanceScore}/100, Thể loại: {d.Category}"));

        var userMessage = $"""
            Danh sách các nhà cung cấp bị hoãn thanh toán:
            {vendorList}

            Vui lòng viết email ngoại giao theo đúng format yêu cầu.
            """;

        _logger.LogInformation(
            "AI CFO composing deferral email for {Count} deferred vendors",
            deferredDebts.Count);

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(SystemPrompt);
        chatHistory.AddUserMessage(userMessage);

        var response = await _chatCompletion.GetChatMessageContentAsync(
            chatHistory,
            cancellationToken: cancellationToken);

        var content = response.Content ?? string.Empty;

        return ParseEmailResponse(content, deferredDebts);
    }

    private static DebtEmailDto ParseEmailResponse(string content, List<DebtItemDto> deferredDebts)
    {
        string subject = "Thư xin gia hạn công nợ - Qúy II/2026";
        var recipients = deferredDebts.Select(d => d.VendorEmail).Distinct().ToList();
        var cc = new List<string> { "cfo@adventureworks.com" };
        string body = content;

        var lines = content.Split('\n');
        var inBody = false;
        var bodyLines = new List<string>();

        foreach (var line in lines)
        {
            var trimmed = line.Trim();

            if (trimmed.StartsWith("SUBJECT:", StringComparison.OrdinalIgnoreCase))
            {
                subject = trimmed["SUBJECT:".Length..].Trim();
            }
            else if (trimmed.StartsWith("TO:", StringComparison.OrdinalIgnoreCase))
            {
                var toContent = trimmed["TO:".Length..].Trim();
                if (!string.IsNullOrWhiteSpace(toContent))
                {
                    recipients = toContent
                        .Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(e => e.Trim())
                        .Where(e => e.Contains('@'))
                        .Distinct()
                        .ToList();
                }
            }
            else if (trimmed.StartsWith("CC:", StringComparison.OrdinalIgnoreCase))
            {
                var ccContent = trimmed["CC:".Length..].Trim();
                if (!string.IsNullOrWhiteSpace(ccContent))
                {
                    cc = ccContent
                        .Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(e => e.Trim())
                        .Where(e => e.Contains('@'))
                        .Distinct()
                        .ToList();
                }
            }
            else if (trimmed.StartsWith("BODY:", StringComparison.OrdinalIgnoreCase) ||
                     inBody)
            {
                inBody = true;
                if (!trimmed.StartsWith("BODY:", StringComparison.OrdinalIgnoreCase))
                {
                    bodyLines.Add(line);
                }
            }
        }

        if (bodyLines.Count > 0)
        {
            body = string.Join("\n", bodyLines).Trim();
        }

        return new DebtEmailDto(subject, recipients, cc, body, "AI-CFO");
    }
}
