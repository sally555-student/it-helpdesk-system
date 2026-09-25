using System.ComponentModel.DataAnnotations.Schema;

namespace HelpDesk.Api.Models;

// Maps to dbo.Ticket — matches Week 1 schema
[Table("Ticket")]
public class Ticket
{
    public int TicketId { get; set; }
    public string TicketReference { get; set; } = string.Empty; // e.g. TCK-2026-0001
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public int CategoryId { get; set; }
    public int PriorityId { get; set; }
    public int StatusId { get; set; }

    public int CreatedByUserId { get; set; }   // Employee who submitted
    public int? AssignedToUserId { get; set; } // IT Support Agent

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedDate { get; set; }
    public DateTime? ResolvedDate { get; set; }
    public DateTime? ClosedDate { get; set; }

    public DateTime? WorkingStartedAt { get; set; }
    public DateTime? WorkingFinishedAt { get; set; }
    public int? TotalWorkingSeconds { get; set; }
    public bool? IsPaused { get; set; }

    public Category Category { get; set; } = null!;
    public Priority Priority { get; set; } = null!;
    public Status Status { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public User? AssignedToUser { get; set; }
    public ICollection<TicketAssignmentRequest> AssignmentRequests { get; set; }
    = new List<TicketAssignmentRequest>();
}
