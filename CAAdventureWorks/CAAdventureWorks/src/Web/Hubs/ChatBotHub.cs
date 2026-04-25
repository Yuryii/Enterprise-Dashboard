using System.Security.Claims;
using CAAdventureWorks.Application.ChatBot.Services;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CAAdventureWorks.Web.Hubs;

[Authorize]
public class ChatBotHub : Hub
{
    private readonly ISemanticKernelService _kernelService;
    private readonly IChatBotDbContext _db;
    private readonly ILogger<ChatBotHub> _logger;

    public ChatBotHub(
        ISemanticKernelService kernelService,
        IChatBotDbContext db,
        ILogger<ChatBotHub> logger)
    {
        _kernelService = kernelService;
        _db = db;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task<ChatSessionDto> CreateSession(string deptId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value
            ?? throw new HubException("User identifier not found.");

        _logger.LogInformation("Creating session for user {UserId}, department {DeptId}", userId, deptId);

        var session = new ChatSession
        {
            SessionId = Guid.NewGuid(),
            DepartmentId = deptId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Session created: {SessionId}", session.SessionId);

        return new ChatSessionDto
        {
            SessionId = session.SessionId,
            DepartmentId = session.DepartmentId,
            CreatedAt = session.CreatedAt
        };
    }

    public async Task SendMessage(string deptId, string sessionIdStr, string message)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value
            ?? throw new HubException("User identifier not found.");

        Guid sessionId;

        if (string.IsNullOrEmpty(sessionIdStr) || !Guid.TryParse(sessionIdStr, out sessionId))
        {
            // Create a new session if none provided
            var session = new ChatSession
            {
                SessionId = Guid.NewGuid(),
                DepartmentId = deptId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.ChatSessions.Add(session);
            await _db.SaveChangesAsync();
            sessionId = session.SessionId;
            await Clients.Caller.SendAsync("SessionCreated", sessionId);
        }

        _logger.LogInformation("User {UserId} sending message in session {SessionId}: {Message}", userId, sessionId, message);

        // Save user message
        var userMessage = new ChatMessage
        {
            MessageId = Guid.NewGuid(),
            SessionId = sessionId,
            Role = ChatMessageRole.User,
            Content = message,
            CreatedAt = DateTime.UtcNow
        };
        _db.ChatMessages.Add(userMessage);

        // Update session last message time
        var session2 = await _db.ChatSessions.FindAsync(sessionId);
        if (session2 != null)
        {
            session2.LastMessageAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();

        // Stream response from Semantic Kernel
        try
        {
            await Clients.Caller.SendAsync("MessageStarted", userMessage.MessageId);

            // Use non-streaming GetResponseAsync for reliable AutoInvokeKernelFunctions support
            var response = await _kernelService.GetResponseAsync(deptId, userId, message);
            var text = response.Content ?? string.Empty;

            // Stream tokens word-by-word for smooth UX
            foreach (var token in ChatBotHubExtensions.TokenizeForStreaming(text))
            {
                await Clients.Caller.SendAsync("ReceiveToken", token);
            }

            // Save assistant message
            var assistantMessage = new ChatMessage
            {
                MessageId = Guid.NewGuid(),
                SessionId = sessionId,
                Role = ChatMessageRole.Assistant,
                Content = text,
                CreatedAt = DateTime.UtcNow
            };
            _db.ChatMessages.Add(assistantMessage);
            await _db.SaveChangesAsync();

            await Clients.Caller.SendAsync("MessageCompleted", userMessage.MessageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting response from Semantic Kernel");
            await Clients.Caller.SendAsync("Error", $"Loi xu ly: {ex.Message}");
        }
    }

    public async Task<List<ChatMessageDto>> GetHistory(string sessionIdStr)
    {
        if (!Guid.TryParse(sessionIdStr, out var sessionId))
        {
            return new List<ChatMessageDto>();
        }

        var messages = _db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new ChatMessageDto
            {
                MessageId = m.MessageId,
                SessionId = m.SessionId,
                Role = m.Role,
                Content = m.Content,
                CreatedAt = m.CreatedAt
            })
            .ToList();

        return messages;
    }

    public async Task<List<ChatSessionDto>> GetSessions(string deptId)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value
            ?? throw new HubException("User identifier not found.");

        var sessions = _db.ChatSessions
            .Where(s => s.UserId == userId && s.DepartmentId == deptId && s.IsActive)
            .OrderByDescending(s => s.LastMessageAt ?? s.CreatedAt)
            .Select(s => new ChatSessionDto
            {
                SessionId = s.SessionId,
                DepartmentId = s.DepartmentId,
                Title = s.Title,
                CreatedAt = s.CreatedAt,
                LastMessageAt = s.LastMessageAt
            })
            .ToList();

        return sessions;
    }
}

public class ChatSessionDto
{
    public Guid SessionId { get; set; }
    public string DepartmentId { get; set; } = null!;
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }
}

public class ChatMessageDto
{
    public Guid MessageId { get; set; }
    public Guid SessionId { get; set; }
    public ChatMessageRole Role { get; set; }
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

public static class ChatBotHubExtensions
{
    public static IEnumerable<string> TokenizeForStreaming(string text)
    {
        var i = 0;
        while (i < text.Length)
        {
            if (text[i] == '`' && i + 2 < text.Length && text[i + 1] == '`' && text[i + 2] == '`')
            {
                var end = text.IndexOf("```", i + 3, StringComparison.Ordinal);
                var fenceEnd = end >= 0 ? end + 3 : text.Length;
                yield return text.Substring(i, fenceEnd - i);
                i = fenceEnd;
                continue;
            }
            if (text[i] == '`')
            {
                var end = text.IndexOf('`', i + 1);
                var codeEnd = end >= 0 ? end + 1 : text.Length;
                yield return text.Substring(i, codeEnd - i);
                i = codeEnd;
                continue;
            }
            if (char.IsWhiteSpace(text[i]))
            {
                yield return text[i].ToString();
                i++;
                continue;
            }
            var wordEnd = i;
            while (wordEnd < text.Length && !char.IsWhiteSpace(text[wordEnd]) && text[wordEnd] != '`')
                wordEnd++;
            yield return text.Substring(i, wordEnd - i);
            i = wordEnd;
        }
    }
}
