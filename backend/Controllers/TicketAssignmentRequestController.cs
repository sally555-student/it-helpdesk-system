using HelpDesk.Api.Data;
using HelpDesk.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketAssignmentRequestController : ControllerBase
{
    private readonly AppDbContext _context;

    public TicketAssignmentRequestController(AppDbContext context)
    {
        _context = context;
    }

    // Agent sends a request to work on an unassigned ticket
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateRequest(int ticketId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(userIdClaim, out int agentId))
            return Unauthorized();

        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(t => t.TicketId == ticketId);

        if (ticket == null)
            return NotFound("Ticket not found.");

        // Ticket must be unassigned
        if (ticket.AssignedToUserId != null)
            return BadRequest("This ticket is already assigned.");

        // Check if this agent already has a pending request
        var existingRequest = await _context.TicketAssignmentRequests
            .FirstOrDefaultAsync(r =>
                r.TicketId == ticketId &&
                r.AgentId == agentId &&
                r.Status == "Pending");

        if (existingRequest != null)
            return BadRequest("You already requested this ticket.");

        var request = new TicketAssignmentRequest
        {
            TicketId = ticketId,
            AgentId = agentId,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };
        // Change ticket status to Pending
        var pendingStatus = await _context.Statuses
            .FirstOrDefaultAsync(s => s.StatusName == "Pending");

        if (pendingStatus == null)
            return BadRequest("Pending status was not found.");

        ticket.StatusId = pendingStatus.StatusId;

        _context.TicketAssignmentRequests.Add(request);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Request sent successfully.",
            requestId = request.RequestId
        });
    }

    // Agent: get his own assignment requests
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyRequests()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(userIdClaim, out int agentId))
            return Unauthorized();

        var requests = await _context.TicketAssignmentRequests
            .Include(r => r.Ticket)
            .Where(r => r.AgentId == agentId)
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new
            {
                r.RequestId,
                r.TicketId,
                TicketReference = r.Ticket.TicketReference,
                TicketTitle = r.Ticket.Title,
                r.AgentId,
                r.Status,
                CreatedDate = r.RequestedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    // Manager/Admin sees pending requests
    [HttpGet("pending")]
    [Authorize]
    public async Task<IActionResult> GetPendingRequests()
    {
        var requests = await _context.TicketAssignmentRequests
            .Include(r => r.Ticket)
            .Include(r => r.Agent)
            .Where(r => r.Status == "Pending")
            .OrderByDescending(r => r.RequestedAt)
            .Select(r => new
            {
                r.RequestId,
                r.TicketId,
                TicketTitle = r.Ticket.Title,
                AgentId = r.AgentId,
                AgentName = r.Agent.FullName,
                r.Status,
                r.RequestedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    // Manager/Admin accepts the request
    [HttpPut("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveRequest(int id)
    {
        var reviewerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(reviewerIdClaim, out int reviewerId))
            return Unauthorized();

        var request = await _context.TicketAssignmentRequests
            .Include(r => r.Ticket)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound("Request not found.");

        if (request.Status != "Pending")
            return BadRequest("This request has already been reviewed.");

        // Make sure ticket is still unassigned
        if (request.Ticket.AssignedToUserId != null)
            return BadRequest("This ticket is already assigned.");

        // Assign ticket to agent
        request.Ticket.AssignedToUserId = request.AgentId;

      

        request.Ticket.StatusId = 1;

        request.Status = "Approved";
        request.ReviewedByUserId = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Request approved and ticket assigned to the agent."
        });
    }

    // Manager/Admin rejects the request
    [HttpPut("{id}/reject")]
    [Authorize]
    public async Task<IActionResult> RejectRequest(int id)
    {
        var reviewerIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(reviewerIdClaim, out int reviewerId))
            return Unauthorized();

        var request = await _context.TicketAssignmentRequests
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            return NotFound("Request not found.");

        if (request.Status != "Pending")
            return BadRequest("This request has already been reviewed.");

        request.Status = "Rejected";
        request.ReviewedByUserId = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Request rejected."
        });
    }
}
