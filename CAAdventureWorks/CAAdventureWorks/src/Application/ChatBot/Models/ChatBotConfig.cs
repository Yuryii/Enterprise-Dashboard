namespace CAAdventureWorks.Application.ChatBot.Models;

public class ChatBotConfig
{
    public bool Enabled { get; set; } = true;
    public string Endpoint { get; set; } = null!;
    public string ApiKey { get; set; } = null!;
    public string Model { get; set; } = null!;
    public Dictionary<string, DepartmentConfig> Departments { get; set; } = new();
}

public class DepartmentConfig
{
    public string DisplayName { get; set; } = null!;
    public List<string> AllowedTables { get; set; } = new();
    public string ChartEndpoint { get; set; } = null!;
    public string SystemPromptFile { get; set; } = null!;
}
