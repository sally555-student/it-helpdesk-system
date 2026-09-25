using System.Net;
using System.Net.Mail;

namespace HelpDesk.Api.Services;

// Sends transactional email over SMTP. Point this at any SMTP provider by
// filling in the "Smtp" section of appsettings.json / user-secrets:
//   - Local dev/testing: Mailtrap (mailtrap.io) sandbox — emails never leave
//     Mailtrap, so you can safely test without spamming real inboxes.
//   - Production: SendGrid, Azure Communication Services, AWS SES, Gmail
//     (with an App Password), etc.
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
    {
        var smtpSection = _configuration.GetSection("Smtp");
        var host = smtpSection["Host"];
        var port = int.Parse(smtpSection["Port"] ?? "587");
        var username = smtpSection["Username"];
        var password = smtpSection["Password"];
        var fromEmail = smtpSection["FromEmail"] ?? "no-reply@helpdesk.local";
        var fromName = smtpSection["FromName"] ?? "IT Help Desk";
        var enableSsl = bool.Parse(smtpSection["EnableSsl"] ?? "true");

        if (string.IsNullOrWhiteSpace(host))
        {
            // No SMTP configured (e.g. fresh clone before secrets are set up).
            // Log the link instead of throwing, so local dev/testing isn't blocked.
            _logger.LogWarning(
                "Smtp:Host is not configured — skipping real email send. " +
                "Password reset link for {Email}: {ResetLink}", toEmail, resetLink);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "Reset your IT Help Desk password",
            IsBodyHtml = true,
            Body = $@"
                <p>Hi {WebUtility.HtmlEncode(toName)},</p>
                <p>We received a request to reset your IT Help Desk password. Click the link below to choose a new one:</p>
                <p><a href=""{resetLink}"">Reset your password</a></p>
                <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
            "
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            Credentials = string.IsNullOrWhiteSpace(username)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(username, password)
        };

        await client.SendMailAsync(message);
    }
}
