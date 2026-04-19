using EnterpriseDashboard.WebApp.Models;

namespace EnterpriseDashboard.WebApp.Services
{
    public interface IEmailSender
    {
        Task SendEmail(EmailData emailData);
    }
}
