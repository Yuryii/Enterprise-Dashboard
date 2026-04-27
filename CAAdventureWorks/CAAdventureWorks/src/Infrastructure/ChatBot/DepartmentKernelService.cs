using System.Net.Http;
using System.Runtime.CompilerServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace CAAdventureWorks.Infrastructure.ChatBot;

public class DepartmentKernelService : Application.ChatBot.Services.ISemanticKernelService
{
    private readonly Dictionary<string, Kernel> _kernels = new();
    private readonly Dictionary<string, Application.ChatBot.Models.DepartmentConfig> _configs = new();
    private readonly ILogger<DepartmentKernelService> _logger;
    private readonly Application.ChatBot.Models.ChatBotConfig _botConfig;
    private readonly string _connectionString;

    public DepartmentKernelService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<DepartmentKernelService> logger)
    {
        _logger = logger;
        _connectionString = configuration.GetConnectionString("AdventureWorks")
            ?? throw new InvalidOperationException("Connection string 'AdventureWorks' not found.");

        _botConfig = configuration.GetSection("ChatBot").Get<Application.ChatBot.Models.ChatBotConfig>()
            ?? throw new InvalidOperationException("ChatBot configuration not found.");

        if (_botConfig.Departments != null)
        {
            foreach (var (deptId, deptConfig) in _botConfig.Departments)
            {
                _configs[deptId] = deptConfig;
            }
        }

        BuildKernels();
    }

    private void BuildKernels()
    {
        foreach (var (deptId, config) in _configs)
        {
            try
            {
                _logger.LogInformation("Building Semantic Kernel for department: {DeptId}", deptId);

                var kernelBuilder = Kernel.CreateBuilder();

                kernelBuilder.AddOpenAIChatCompletion(
                    modelId: _botConfig.Model,
                    apiKey: _botConfig.ApiKey,
                    endpoint: new Uri(_botConfig.Endpoint));

                var kernel = kernelBuilder.Build();

                // Add Text2SQL plugin only for departments that explicitly allow database tables.
                // Executive PDF AI assessment uses already-filtered dashboard JSON, so it must not invoke SQL tools.
                if (config.AllowedTables.Count > 0)
                {
                    var textToSqlPlugin = new Plugins.TextToSqlPlugin(_connectionString, config.AllowedTables);
                    kernel.Plugins.AddFromObject(textToSqlPlugin, "TextToSql");
                }

                _kernels[deptId] = kernel;
                _logger.LogInformation("Semantic Kernel built successfully for department: {DeptId}", deptId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to build Semantic Kernel for department: {DeptId}", deptId);
            }
        }
    }

    private string GetSystemPrompt(string deptId)
    {
        if (!_configs.TryGetValue(deptId, out var config))
            return string.Empty;

        try
        {
            var basePath = AppContext.BaseDirectory;
            var fullPath = Path.Combine(basePath, config.SystemPromptFile);

            if (File.Exists(fullPath))
            {
                return File.ReadAllText(fullPath);
            }

            // Try Web project root
            var webPath = Path.Combine(Directory.GetCurrentDirectory(), config.SystemPromptFile);
            if (File.Exists(webPath))
            {
                return File.ReadAllText(webPath);
            }

            _logger.LogWarning("System prompt file not found for department {DeptId}: {Path}", deptId, config.SystemPromptFile);
            return GetDefaultPrompt(deptId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load system prompt for department: {DeptId}", deptId);
            return GetDefaultPrompt(deptId);
        }
    }

    private string GetDefaultPrompt(string deptId)
    {
        return deptId.ToLower() switch
        {
            "sales" => "Ban la tro ly AI chuyen ho tro nhan vien phong Kinh Doanh AdventureWorks. Chi duoc truy van cac bang: Sales.SalesOrderHeader, Sales.SalesOrderDetail, Sales.Customer, Sales.SalesPerson, Sales.SalesTerritory. Khong bao gio tiep lo thong tin nhan vien khac. Tra loi tieng Viet.",
            "executive" => "Ban la chuyen gia phan tich dieu hanh AdventureWorks. Hay danh gia KPI, doanh thu, chi mua, nhan su, nha cung cap va san xuat bang tieng Viet ngan gon, uu tien hanh dong quan tri va rui ro.",
            _ => "Ban la tro ly AI cua AdventureWorks. Hay tra loi tieng Viet, than thien."
        };
    }

    public async Task<Application.ChatBot.Services.ChatResponse> GetResponseAsync(
        string deptId, string userId, string message, CancellationToken ct = default)
    {
        if (!_kernels.TryGetValue(deptId, out var kernel))
            throw new InvalidOperationException($"Unknown department: {deptId}");

        _logger.LogInformation("Getting chat response for department: {DeptId}, user: {UserId}", deptId, userId);

        var chatService = kernel.GetRequiredService<IChatCompletionService>();
        var settings = new OpenAIPromptExecutionSettings
        {
            Temperature = 0.7,
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions
        };

        var history = new Microsoft.SemanticKernel.ChatCompletion.ChatHistory();
        history.AddSystemMessage(GetSystemPrompt(deptId));
        history.AddUserMessage(message);

        var result = await chatService.GetChatMessageContentAsync(history, settings, kernel, ct);
        return new Application.ChatBot.Services.ChatResponse(result.Content ?? string.Empty, null);
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        string deptId, string userId, string message,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var response = await GetResponseAsync(deptId, userId, message, ct);
        foreach (var token in TokenizeForStreaming(response.Content ?? string.Empty))
        {
            yield return token;
        }
    }

    private static IEnumerable<string> TokenizeForStreaming(string text)
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
