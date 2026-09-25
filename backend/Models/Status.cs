namespace HelpDesk.Api.Models;

// Maps to dbo.Status — matches Week 1 schema
public class Status
{
    public int StatusId { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
