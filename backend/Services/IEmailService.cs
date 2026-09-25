namespace HelpDesk.Api.Services;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink);
}
