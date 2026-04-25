namespace CAAdventureWorks.Application.ChatBot.Services;

public interface ISemanticKernelService
{
    Task<ChatResponse> GetResponseAsync(string deptId, string userId, string message, CancellationToken ct = default);
    IAsyncEnumerable<string> StreamResponseAsync(string deptId, string userId, string message, CancellationToken ct = default);
}

public record ChatResponse(string Content, int? TokensUsed);
