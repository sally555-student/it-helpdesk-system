namespace HelpDesk.Api.Models;

public class TicketComment
{
    public int CommentId { get; set; }

    public int TicketId { get; set; }

    public int UserId { get; set; }

    public string CommentText { get; set; } = string.Empty;

    public string CommentType { get; set; } = "Public";

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public Ticket? Ticket { get; set; }

    public User? User { get; set; }
}