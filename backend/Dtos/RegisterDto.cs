using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.Dtos;

public class RegisterDto
{
    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    public string? Department { get; set; }
}
