using HelpDesk.Api.Dtos;

namespace HelpDesk.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto request);
    Task<AuthResponseDto> LoginAsync(LoginDto request);
    Task ForgotPasswordAsync(ForgotPasswordDto request);
    Task ResetPasswordAsync(ResetPasswordDto request);
}
