namespace HelpDesk.Api.Dtos;

// Bound from query string on GET /api/ticket, e.g.
// GET /api/ticket?statusId=1&categoryId=4&search=outlook
public class TicketFilterDto
{
    public int? StatusId { get; set; }
    public int? CategoryId { get; set; }
    public int? PriorityId { get; set; }

    // Matches against Title, Description, and TicketReference (case-insensitive).
    public string? Search { get; set; }
}
