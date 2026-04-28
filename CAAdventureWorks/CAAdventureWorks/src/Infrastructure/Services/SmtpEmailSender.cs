using System.Net;
using System.Net.Mail;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.DebtOptimization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CAAdventureWorks.Infrastructure.Services;

public sealed class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
    public bool UseDefaultCredentials { get; set; } = false;
}

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly SmtpSettings _settings;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpSettings> settings, ILogger<SmtpEmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendAsync(EmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            using var mail = new MailMessage();
            mail.From = new MailAddress(_settings.FromAddress, _settings.FromName);

            foreach (var recipient in request.To)
            {
                mail.To.Add(recipient);
            }

            if (request.Cc != null)
            {
                foreach (var cc in request.Cc)
                {
                    mail.CC.Add(cc);
                }
            }

            mail.Subject = request.Subject;
            mail.Body = request.Body;
            mail.IsBodyHtml = false;

            using var smtp = new SmtpClient(_settings.Host, _settings.Port)
            {
                EnableSsl = _settings.EnableSsl,
                UseDefaultCredentials = _settings.UseDefaultCredentials,
                Credentials = !_settings.UseDefaultCredentials
                    ? new NetworkCredential(_settings.Username, _settings.Password)
                    : null
            };

            _logger.LogInformation(
                "Sending email to {RecipientCount} recipients via SMTP {Host}:{Port}",
                request.To.Count,
                _settings.Host,
                _settings.Port);

            await smtp.SendMailAsync(mail, cancellationToken);

            _logger.LogInformation("Email sent successfully to {Recipients}", string.Join(", ", request.To));

            return new EmailSendResult(true, null, DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email. Error: {Message}", ex.Message);
            return new EmailSendResult(false, ex.Message, DateTime.UtcNow);
        }
    }
}
