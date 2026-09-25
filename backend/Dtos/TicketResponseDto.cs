namespace HelpDesk.Api.Dtos;

public class TicketResponseDto
{
    public int TicketId { get; set; }
    public string TicketReference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Raw ids so an edit form can preselect the right dropdown option...
    public int CategoryId { get; set; }
    public int PriorityId { get; set; }
    public int StatusId { get; set; }
    public int? AssignedToUserId { get; set; }

    // ...and display names so a read-only list doesn't need a second round trip.
    public string CategoryName { get; set; } = string.Empty;
    public string PriorityName { get; set; } = string.Empty;
    public string StatusName { get; set; } = string.Empty;
    public string? AssignedToUserName { get; set; }

    public int CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public DateTime? ResolvedDate { get; set; }
    public DateTime? ClosedDate { get; set; }

    public DateTime? WorkingStartedAt { get; set; }
    public DateTime? WorkingFinishedAt { get; set; }
    public int? TotalWorkingSeconds { get; set; }
    public bool? IsPaused { get; set; }
}
