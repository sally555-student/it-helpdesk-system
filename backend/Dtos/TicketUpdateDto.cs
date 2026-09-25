using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.Dtos;

// One shared "update" shape for every role. Which fields actually get applied depends
// on who's calling — see TicketService.UpdateTicketAsync. An Employee editing their own
// open ticket can only ever change Title/Description/CategoryId/PriorityId; StatusId and
// AssignedToUserId are silently ignored for them even if present in the request body.
public class TicketUpdateDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    [Required]
    public int PriorityId { get; set; }

    [Required]
    public int StatusId { get; set; }

    public int? AssignedToUserId { get; set; }

    public DateTime? WorkingStartedAt { get; set; }
    public DateTime? WorkingFinishedAt { get; set; }
    public int? TotalWorkingSeconds { get; set; }
    public bool? IsPaused { get; set; }
}
