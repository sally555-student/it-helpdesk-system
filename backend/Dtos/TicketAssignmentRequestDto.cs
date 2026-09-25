namespace HelpDesk.Api.DTOs;

public class TicketAssignmentRequestDto
{
    public int RequestId { get; set; }

    public int TicketId { get; set; }

    public string TicketTitle { get; set; } = string.Empty;

    public int AgentId { get; set; }

    public string AgentName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime RequestedAt { get; set; }

    public int? ReviewedByUserId { get; set; }

    public DateTime? ReviewedAt { get; set; }
}