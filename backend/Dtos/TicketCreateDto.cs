using System.ComponentModel.DataAnnotations;

namespace HelpDesk.Api.Dtos;

public class TicketCreateDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public int CategoryId { get; set; }

    [Required]
    public int PriorityId { get; set; }

    // No StatusId here on purpose — every new ticket starts as "Open".
    // No CreatedByUserId here either — that comes from the JWT, never from client input.
}
