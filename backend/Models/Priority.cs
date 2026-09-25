namespace HelpDesk.Api.Models;

// Maps to dbo.Priority — matches Week 1 schema
public class Priority
{
    public int PriorityId { get; set; }
    public string PriorityName { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
