using System.Security.Claims;

namespace HelpDesk.Api.Helpers;

public static class ClaimsPrincipalExtensions
{
    // AuthService puts these claims on every token it issues (see GenerateJwtToken).
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token is missing the user id claim.");
        return int.Parse(claim.Value);
    }

    public static string GetRole(this ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }
}
