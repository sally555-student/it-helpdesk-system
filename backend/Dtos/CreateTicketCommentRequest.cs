namespace HelpDesk.Api.Dtos;

public class CreateTicketCommentRequest
{
    public string CommentText { get; set; } = string.Empty;

    public string CommentType { get; set; } = "Public";
}