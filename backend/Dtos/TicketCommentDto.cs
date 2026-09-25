namespace HelpDesk.Api.Dtos;

public class TicketCommentDto
{
    public int CommentId { get; set; }

    public int TicketId { get; set; }

    public int UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string UserRole { get; set; } = string.Empty;

    public string CommentText { get; set; } = string.Empty;

    public string CommentType { get; set; } = "Public";

    public DateTime CreatedDate { get; set; }
}