using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.Dtos;

public class ForgotPasswordDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}
