using HelpDesk.Api.Dtos;

namespace HelpDesk.Api.Services;

public interface ITicketService
{
    Task<List<TicketResponseDto>> GetTicketsAsync(
        int currentUserId,
        string currentUserRole,
        TicketFilterDto filter);

    Task<TicketResponseDto?> GetTicketByIdAsync(
        int ticketId,
        int currentUserId,
        string currentUserRole);

    Task<TicketResponseDto> CreateTicketAsync(
        TicketCreateDto request,
        int currentUserId);

    Task<TicketResponseDto> UpdateTicketAsync(
        int ticketId,
        TicketUpdateDto request,
        int currentUserId,
        string currentUserRole);

    Task<TicketResponseDto> AssignTicketAsync(
        int ticketId,
        int agentId,
        int currentUserId,
        string currentUserRole);

    Task DeleteTicketAsync(
        int ticketId,
        int currentUserId,
        string currentUserRole);
}