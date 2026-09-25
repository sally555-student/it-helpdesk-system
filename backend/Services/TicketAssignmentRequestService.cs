using HelpDesk.Api.Data;
using HelpDesk.Api.DTOs;
using HelpDesk.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Services;

public class TicketAssignmentRequestService
    : ITicketAssignmentRequestService
{
    private readonly AppDbContext _context;

    public TicketAssignmentRequestService(AppDbContext context)
    {
        _context = context;
    }

    // Agent sends request
    public async Task<TicketAssignmentRequestDto> CreateRequestAsync(
        int ticketId,
        int agentId)
    {
        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(t => t.TicketId == ticketId);

        if (ticket == null)
            throw new Exception("Ticket not found.");

        if (ticket.AssignedToUserId != null)
            throw new Exception("This ticket is already assigned.");

        var existingRequest =
            await _context.TicketAssignmentRequests
                .FirstOrDefaultAsync(r =>
                    r.TicketId == ticketId &&
                    r.AgentId == agentId &&
                    r.Status == "Pending");

        if (existingRequest != null)
            throw new Exception(
                "You already requested this ticket.");

        var request = new TicketAssignmentRequest
        {
            TicketId = ticketId,
            AgentId = agentId,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };

        _context.TicketAssignmentRequests.Add(request);

        await _context.SaveChangesAsync();

        // Get agent information for the DTO
        var agent = await _context.Users
            .FirstOrDefaultAsync(u => u.UserId == agentId);

        return new TicketAssignmentRequestDto
        {
            RequestId = request.RequestId,
            TicketId = request.TicketId,
            TicketTitle = ticket.Title,
            AgentId = request.AgentId,
            AgentName = agent?.FullName ?? string.Empty,
            Status = request.Status,
            RequestedAt = request.RequestedAt,
            ReviewedByUserId = request.ReviewedByUserId,
            ReviewedAt = request.ReviewedAt
        };
    }

    // Manager/Admin see pending requests
    public async Task<IEnumerable<TicketAssignmentRequestDto>>
        GetPendingRequestsAsync()
    {
        return await _context.TicketAssignmentRequests
            .Include(r => r.Ticket)
            .Include(r => r.Agent)
            .Where(r => r.Status == "Pending")
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new TicketAssignmentRequestDto
            {
                RequestId = r.RequestId,
                TicketId = r.TicketId,
                TicketTitle = r.Ticket.Title,
                AgentId = r.AgentId,
                AgentName = r.Agent.FullName,
                Status = r.Status,
                RequestedAt = r.RequestedAt,
                ReviewedByUserId = r.ReviewedByUserId,
                ReviewedAt = r.ReviewedAt
            })
            .ToListAsync();
    }

    // Manager/Admin approve
    public async Task ApproveRequestAsync(
        int requestId,
        int reviewerId)
    {
        var request =
            await _context.TicketAssignmentRequests
                .Include(r => r.Ticket)
                .FirstOrDefaultAsync(
                    r => r.RequestId == requestId);

        if (request == null)
            throw new Exception("Request not found.");

        if (request.Status != "Pending")
            throw new Exception(
                "This request has already been reviewed.");

        if (request.Ticket.AssignedToUserId != null)
            throw new Exception(
                "This ticket is already assigned.");

        request.Ticket.AssignedToUserId = request.AgentId;

        request.Status = "Approved";
        request.ReviewedByUserId = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    // Manager/Admin reject
    public async Task RejectRequestAsync(
        int requestId,
        int reviewerId)
    {
        var request =
            await _context.TicketAssignmentRequests
                .FirstOrDefaultAsync(
                    r => r.RequestId == requestId);

        if (request == null)
            throw new Exception("Request not found.");

        if (request.Status != "Pending")
            throw new Exception(
                "This request has already been reviewed.");

        request.Status = "Rejected";
        request.ReviewedByUserId = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}