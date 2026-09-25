using System.ComponentModel.DataAnnotations.Schema;

namespace HelpDesk.Api.Models;

[Table("AuditLog")]
public class AuditLog
{
    public int AuditLogId { get; set; }

    // User who performed the action
    public int? UserId { get; set; }

    // Examples:
    // "Created Ticket"
    // "Updated Ticket"
    // "Assigned Ticket"
    // "Changed Status"
    // "Created Category"
    public string Action { get; set; } = string.Empty;

    // Examples:
    // "Ticket"
    // "User"
    // "Category"
    // "Assignment Request"
    public string EntityType { get; set; } = string.Empty;

    // ID of the affected entity
    public int? EntityId { get; set; }

    // Human-readable explanation
    public string Description { get; set; } = string.Empty;

    // Previous value, when applicable
    public string? OldValue { get; set; }

    // New value, when applicable
    public string? NewValue { get; set; }

    // IP address of the user
    public string? IpAddress { get; set; }

    // When the action happened
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User? User { get; set; }
}