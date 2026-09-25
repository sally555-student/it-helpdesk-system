using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HelpDesk.Api.Data;
using HelpDesk.Api.Dtos;
using HelpDesk.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace HelpDesk.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    // Every new self-registered user gets the "Employee" role.
    // Admin/Agent/Manager accounts should be created or promoted by an Admin.
    private const int DefaultEmployeeRoleId = 3;

    // --- Account lockout settings ---
    private const int MaxFailedLoginAttempts = 5;
    private const int LockoutMinutes = 15;

    // --- Password reset settings ---
    private const int PasswordResetTokenValidMinutes = 60;

    public AuthService(
        AppDbContext dbContext,
        IConfiguration configuration,
        IEmailService emailService)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _emailService = emailService;
    }


    // =========================================================
    // REGISTER
    // =========================================================

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto request)
    {
        // Validate password before creating the account
        ValidatePassword(request.Password);

        bool emailTaken = await _dbContext.Users
            .AnyAsync(u => u.Email == request.Email);

        if (emailTaken)
        {
            throw new InvalidOperationException(
                "That email is already registered.");
        }

        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = DefaultEmployeeRoleId,
            Department = request.Department,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Users.Add(user);

        await _dbContext.SaveChangesAsync();

        return BuildAuthResponse(user, "Employee");
    }


    // =========================================================
    // LOGIN
    // =========================================================

    public async Task<AuthResponseDto> LoginAsync(LoginDto request)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        // Same generic message whether the email doesn't exist
        // or the password is wrong.
        const string invalidCredentialsMessage =
            "Invalid email or password.";

        if (user is null)
        {
            throw new UnauthorizedAccessException(
                invalidCredentialsMessage);
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException(
                "This account has been deactivated.");
        }

        // Check lockout BEFORE verifying the password
        if (user.LockoutEndDate is not null &&
            user.LockoutEndDate > DateTime.UtcNow)
        {
            var minutesLeft = Math.Ceiling(
                (user.LockoutEndDate.Value - DateTime.UtcNow)
                .TotalMinutes);

            throw new UnauthorizedAccessException(
                $"Too many failed login attempts. " +
                $"Try again in {minutesLeft} minute(s).");
        }

        bool passwordCorrect =
            BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash);

        if (!passwordCorrect)
        {
            user.FailedLoginAttempts += 1;

            if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
            {
                user.LockoutEndDate =
                    DateTime.UtcNow.AddMinutes(LockoutMinutes);

                await _dbContext.SaveChangesAsync();

                throw new UnauthorizedAccessException(
                    $"Too many failed login attempts. " +
                    $"Your account is locked for " +
                    $"{LockoutMinutes} minutes.");
            }

            await _dbContext.SaveChangesAsync();

            throw new UnauthorizedAccessException(
                invalidCredentialsMessage);
        }

        // Successful login:
        // clear failed attempts and lockout state.
        // Successful login:
        // clear failed attempts and lockout state.
        user.FailedLoginAttempts = 0;
        user.LockoutEndDate = null;

        // Record the latest successful login
        user.LastLoginDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return BuildAuthResponse(
            user,
            user.Role.RoleName);
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    public async Task ForgotPasswordAsync(
        ForgotPasswordDto request)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        // Always behave the same way whether or not
        // the email exists.
        if (user is null || !user.IsActive)
        {
            return;
        }

        // Generate secure random token
        var rawToken = GenerateSecureToken();

        // Store only the hash of the token
        user.PasswordResetTokenHash =
            HashToken(rawToken);

        user.PasswordResetTokenExpiryDate =
            DateTime.UtcNow.AddMinutes(
                PasswordResetTokenValidMinutes);

        await _dbContext.SaveChangesAsync();

        var frontendBaseUrl =
            _configuration["AppSettings:FrontendBaseUrl"]
            ?? "http://localhost:5173";

        var resetLink =
            $"{frontendBaseUrl}/reset-password" +
            $"?token={Uri.EscapeDataString(rawToken)}" +
            $"&email={Uri.EscapeDataString(user.Email)}";

        await _emailService.SendPasswordResetEmailAsync(
            user.Email,
            user.FullName,
            resetLink);
    }


    // =========================================================
    // RESET PASSWORD
    // =========================================================

    public async Task ResetPasswordAsync(
        ResetPasswordDto request)
    {
        // Validate the new password
        ValidatePassword(request.NewPassword);

        var user = await _dbContext.Users
            .FirstOrDefaultAsync(
                u => u.Email == request.Email);

        var tokenHash = HashToken(request.Token);

        bool tokenValid =
            user is not null
            && user.PasswordResetTokenHash is not null
            && user.PasswordResetTokenHash == tokenHash
            && user.PasswordResetTokenExpiryDate is not null
            && user.PasswordResetTokenExpiryDate > DateTime.UtcNow;

        if (!tokenValid)
        {
            throw new UnauthorizedAccessException(
                "This password reset link is invalid or has expired.");
        }

        // Hash the new password before storing it
        user!.PasswordHash =
            BCrypt.Net.BCrypt.HashPassword(
                request.NewPassword);

        // Clear reset token
        user.PasswordResetTokenHash = null;
        user.PasswordResetTokenExpiryDate = null;

        // Clear account lockout
        user.FailedLoginAttempts = 0;
        user.LockoutEndDate = null;
        user.PasswordChangedDate = DateTime.UtcNow;
        user.UpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
    }


    // =========================================================
    // PASSWORD VALIDATION
    // =========================================================

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException(
                "Password is required.");
        }

        // Minimum 8 characters
        if (password.Length < 8)
        {
            throw new ArgumentException(
                "Password must be at least 8 characters long.");
        }

        // At least one uppercase letter
        if (!password.Any(char.IsUpper))
        {
            throw new ArgumentException(
                "Password must contain at least one uppercase letter.");
        }

        // At least one lowercase letter
        if (!password.Any(char.IsLower))
        {
            throw new ArgumentException(
                "Password must contain at least one lowercase letter.");
        }

        // At least one number
        if (!password.Any(char.IsDigit))
        {
            throw new ArgumentException(
                "Password must contain at least one number.");
        }

        // At least one symbol
        if (!password.Any(
            ch => !char.IsLetterOrDigit(ch)))
        {
            throw new ArgumentException(
                "Password must contain at least one symbol.");
        }
    }


    // =========================================================
    // SECURE PASSWORD RESET TOKEN
    // =========================================================

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }


    // =========================================================
    // HASH RESET TOKEN
    // =========================================================

    private static string HashToken(string rawToken)
    {
        var bytes =
            SHA256.HashData(
                Encoding.UTF8.GetBytes(rawToken));

        return Convert.ToHexString(bytes);
    }


    // =========================================================
    // BUILD AUTH RESPONSE
    // =========================================================

    private AuthResponseDto BuildAuthResponse(
        User user,
        string roleName)
    {
        string token =
            GenerateJwtToken(user, roleName);

        return new AuthResponseDto
        {
            Token = token,
            FullName = user.FullName,
            Role = roleName
        };
    }


    // =========================================================
    // GENERATE JWT TOKEN
    // =========================================================

    private string GenerateJwtToken(
        User user,
        string roleName)
    {
        var claims = new List<Claim>
        {
            new(
                ClaimTypes.NameIdentifier,
                user.UserId.ToString()),

            new(
                ClaimTypes.Name,
                user.FullName),

            new(
                ClaimTypes.Email,
                user.Email),

            new(
                ClaimTypes.Role,
                roleName)
        };

        var key =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _configuration["Jwt:Key"]!));

        var credentials =
            new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

        var token =
            new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: credentials
            );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}
