using HelpDesk.Api.DTOs;

namespace HelpDesk.Api.Services;

public interface ITicketAssignmentRequestService
{
    Task<TicketAssignmentRequestDto> CreateRequestAsync(
        int ticketId,
        int agentId);

    Task<IEnumerable<TicketAssignmentRequestDto>>
        GetPendingRequestsAsync();

    Task ApproveRequestAsync(
        int requestId,
        int reviewerId);

    Task RejectRequestAsync(
        int requestId,
        int reviewerId);
}