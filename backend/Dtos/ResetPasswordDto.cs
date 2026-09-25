using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.Dtos;

public class ResetPasswordDto
{
    // The raw token from the emailed link (not the hash stored in the DB).
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
