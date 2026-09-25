using System.ComponentModel.DataAnnotations.Schema;
using System.Net.Sockets;

namespace HelpDesk.Api.Models;

// Maps to dbo.[User] — bracketed in SQL because USER is a reserved word in T-SQL
[Table("User")]
public class User
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string? Department { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }

    // --- Account lockout (brute-force protection) ---
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutEndDate { get; set; }

    // --- Password reset ---
    // We store a SHA-256 hash of the reset token, never the raw token, the same
    // way we never store the raw password. The raw token only ever exists in the
    // emailed link and in memory for the length of one request.
    public string? PasswordResetTokenHash { get; set; }
    public DateTime? PasswordResetTokenExpiryDate { get; set; }
    public DateTime? LastLoginDate { get; set; }

    public DateTime? PasswordChangedDate { get; set; }

    public DateTime? ProfileUpdatedDate { get; set; }

    public Role Role { get; set; } = null!;
    public ICollection<Ticket> CreatedTickets { get; set; } = new List<Ticket>();
    public ICollection<Ticket> AssignedTickets { get; set; } = new List<Ticket>();
    public ICollection<TicketAssignmentRequest> AssignmentRequests { get; set; }
    = new List<TicketAssignmentRequest>();

    public ICollection<TicketAssignmentRequest> ReviewedAssignmentRequests { get; set; }
        = new List<TicketAssignmentRequest>();
}
