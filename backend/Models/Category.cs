namespace HelpDesk.Api.Models;

// Maps to dbo.Category — matches Week 1 schema
public class Category
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}
