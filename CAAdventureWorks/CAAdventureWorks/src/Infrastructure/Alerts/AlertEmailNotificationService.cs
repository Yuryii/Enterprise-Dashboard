using System.Configuration;
using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.DebtOptimization;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CAAdventureWorks.Infrastructure.Alerts;

public sealed class AlertEmailSettings
{
    public List<string> ExecutiveEmails { get; set; } = [];
    public List<string> FinanceEmails { get; set; } = [];
}

public class AlertEmailNotificationService : IAlertEmailNotificationService
{
    private readonly IEmailSender _emailSender;
    private readonly AlertEmailSettings _settings;
    private readonly ILogger<AlertEmailNotificationService> _logger;

    public AlertEmailNotificationService(
        IEmailSender emailSender,
        IOptions<AlertEmailSettings> settings,
        ILogger<AlertEmailNotificationService> logger)
    {
        _emailSender = emailSender;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SendAlertEmailAsync(AlertHistory history, AlertConfiguration config, CancellationToken ct = default)
    {
        var departmentCode = config.DepartmentCode;
        _logger.LogWarning("[EmailDebug] UserEmail={UserEmail}, DeptCode={DeptCode}",
            config.UserEmail, departmentCode);

        List<string> recipients;

        if (!string.IsNullOrWhiteSpace(config.UserEmail))
        {
            recipients = [config.UserEmail];
            _logger.LogWarning("[EmailDebug] Using UserEmail: {Email}", config.UserEmail);
        }
        else
        {
            recipients = departmentCode switch
            {
                "Executive" => _settings.ExecutiveEmails,
                "Finance" => _settings.FinanceEmails,
                _ => [],
            };
            _logger.LogWarning("[EmailDebug] Using fallback emails. Executive={ExecEmails}, Finance={FinEmails}",
                _settings.ExecutiveEmails.Count, _settings.FinanceEmails.Count);
        }

        _logger.LogWarning("[EmailDebug] Recipients count: {Count}", recipients.Count);

        if (recipients.Count == 0)
        {
            _logger.LogWarning(
                "No email recipients configured for department: {DeptCode}, UserId={UserId}. Alert {AlertName} triggered.",
                departmentCode, config.UserId, history.AlertDefinition?.Name ?? "Unknown");
            return;
        }

        var subject = $"[CANH BAO] {history.AlertDefinition?.Name ?? "Cảnh báo"} - {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
        var body = BuildEmailBody(history, departmentCode);

        var request = new EmailRequest(recipients, null, subject, body);
        var result = await _emailSender.SendAsync(request, ct);

        if (result.Success)
        {
            _logger.LogInformation(
                "Alert email sent successfully. Department={DeptCode}, AlertName={AlertName}, Recipients={Recipients}",
                departmentCode,
                history.AlertDefinition?.Name,
                string.Join(", ", recipients));
        }
        else
        {
            _logger.LogWarning(
                "Alert email failed. Department={DeptCode}, AlertName={AlertName}, Error={Error}",
                departmentCode,
                history.AlertDefinition?.Name,
                result.ErrorMessage);
        }
    }

    private static string BuildEmailBody(AlertHistory history, string departmentCode)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== HỆ THỐNG CẢNH BÁO TỰ ĐỘNG ===");
        sb.AppendLine();
        sb.AppendLine($"Phòng ban: {departmentCode}");
        sb.AppendLine($"Tên cảnh báo: {history.AlertDefinition?.Name ?? "N/A"}");
        sb.AppendLine($"Mã cảnh báo: {history.AlertDefinition?.Code ?? "N/A"}");
        sb.AppendLine($"Thời gian kích hoạt: {history.TriggeredAt:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine();
        sb.AppendLine("--- Chi tiết ---");
        sb.AppendLine($"Ngưỡng cấu hình: {history.ThresholdValue:N2}");
        sb.AppendLine($"Giá trị thực tế: {history.ActualValue:N2}");
        sb.AppendLine($"Thông điệp: {history.Message}");
        sb.AppendLine();
        sb.AppendLine("--- Hành động ---");
        sb.AppendLine("Vui lòng kiểm tra hệ thống cảnh báo để xem chi tiết và xác nhận.");
        sb.AppendLine("Email này được gửi tự động bởi hệ thống cảnh báo.");
        return sb.ToString();
    }
}
