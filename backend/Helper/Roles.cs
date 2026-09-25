namespace HelpDesk.Api.Helpers;

// These strings must match dbo.Role.RoleName exactly (seeded in AppDbContext / Week 1 schema.sql).
// Centralizing them here avoids typos scattered across [Authorize(Roles = "...")] attributes
// and service-layer role checks.
public static class Roles
{
    public const string Admin = "Admin";
    public const string Agent = "IT Support Agent";
    public const string Employee = "Employee";
    public const string Manager = "Manager";
}
