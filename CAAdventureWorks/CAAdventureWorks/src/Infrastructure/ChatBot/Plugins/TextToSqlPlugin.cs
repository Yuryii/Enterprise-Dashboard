using System.ComponentModel;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.SemanticKernel;

namespace CAAdventureWorks.Infrastructure.ChatBot.Plugins;

public class TextToSqlPlugin
{
    private readonly string[] _allowedTables;
    private readonly string _connectionString;

    private static readonly string[] _forbiddenTables = new[]
    {
        "Password",
        "EmailAddress",
        "EmployeePayHistory",
        "PersonPhone",
        "CreditCard"
    };

    public TextToSqlPlugin(string connectionString, IEnumerable<string> allowedTables)
    {
        _connectionString = connectionString;
        _allowedTables = allowedTables.ToArray();
    }

    [KernelFunction]
    [Description("Chuyen cau hoi tieng Viet thanh SQL query. Chi duoc truy van cac bang da duoc phep trong danh sach. Luon them TOP 1000 de gioi han ket qua. Tra ve ket qua dang JSON voi format: {query: ..., results: [...]} Neu co loi thi tra ve: {error: ...}")]
    public async Task<string> ExecuteQuery(
        Kernel kernel,
        [Description("Cau hoi tieng Viet cua nguoi dung ve du lieu")] string question,
        [Description("SQL query can thuc thi")] string sqlQuery)
    {
        try
        {
            // Validate SQL query
            var validationResult = ValidateSql(sqlQuery);
            if (!validationResult.IsValid)
            {
                return JsonSerializer.Serialize(new { error = validationResult.ErrorMessage });
            }

            // Execute query
            var results = await ExecuteSqlAsync(sqlQuery);
            return JsonSerializer.Serialize(new { query = sqlQuery, results });
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { error = $"Loi thuc thi: {ex.Message}" });
        }
    }

    private (bool IsValid, string? ErrorMessage) ValidateSql(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
            return (false, "SQL query khong duoc rong.");

        var upperSql = sql.ToUpperInvariant();

        // Check for forbidden tables
        foreach (var forbidden in _forbiddenTables)
        {
            if (upperSql.Contains(forbidden.ToUpperInvariant()))
            {
                return (false, $"Bang '{forbidden}' khong duoc phep truy cap.");
            }
        }

        // Check for allowed tables (must contain at least one)
        var containsAllowed = _allowedTables.Any(table =>
            upperSql.Contains(table.ToUpperInvariant()));

        if (!containsAllowed)
        {
            return (false, $"Query phai chua it nhat mot bang duoc phep: {string.Join(", ", _allowedTables)}");
        }

        // Only SELECT allowed
        if (!upperSql.TrimStart().StartsWith("SELECT"))
        {
            return (false, "Chi cho phep truy van SELECT.");
        }

        // Block dangerous keywords
        var dangerous = new[] { "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE", "EXEC", "EXECUTE" };
        foreach (var kw in dangerous)
        {
            if (Regex.IsMatch(upperSql, $@"\b{kw}\b"))
            {
                return (false, $"Tu khoa '{kw}' khong duoc phep su dung.");
            }
        }

        return (true, null);
    }

    private async Task<List<Dictionary<string, object?>>> ExecuteSqlAsync(string sql)
    {
        var results = new List<Dictionary<string, object?>>();

        await using var conn = new SqlConnection(_connectionString);
        await using var cmd = new SqlCommand(sql, conn);

        // Add TOP 1000 if not present
        if (!Regex.IsMatch(sql.ToUpperInvariant(), @"\bTOP\s+\d+\b"))
        {
            var match = Regex.Match(sql, @"\bSELECT\b", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                sql = Regex.Replace(sql, @"\bSELECT\b", "SELECT TOP 1000", RegexOptions.IgnoreCase);
                cmd.CommandText = sql;
            }
        }
        else
        {
            cmd.CommandText = sql;
        }

        await conn.OpenAsync();
        await using var reader = await cmd.ExecuteReaderAsync();

        var columns = new List<string>();
        for (int i = 0; i < reader.FieldCount; i++)
        {
            columns.Add(reader.GetName(i));
        }

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            foreach (var col in columns)
            {
                var value = reader[col];
                row[col] = value == DBNull.Value ? null : value;
            }
            results.Add(row);
        }

        return results;
    }
}
