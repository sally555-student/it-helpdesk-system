namespace HelpDesk.Api.Models;

// Maps to dbo.Role — matches Week 1 schema (singular table name)
public class Role
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}
