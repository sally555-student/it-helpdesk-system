using System.ComponentModel.DataAnnotations.Schema;

namespace HelpDesk.Api.Models;


[Table("TicketAssignmentRequest")]
public class TicketAssignmentRequest
{
    public int RequestId { get; set; }

    // Ticket requested by the agent
    public int TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;

    // Agent who requested the ticket
    public int AgentId { get; set; }
    public User Agent { get; set; } = null!;

    // Pending / Approved / Rejected
    public string Status { get; set; } = "Pending";

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    // Manager/Admin who reviewed the request
    public int? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }

    public DateTime? ReviewedAt { get; set; }
}