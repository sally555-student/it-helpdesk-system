using HelpDesk.Api.Dtos;
using HelpDesk.Api.Helpers;
using HelpDesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // every action here requires a logged-in user; role checks happen inside TicketService
public class TicketController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    // GET /api/ticket?statusId=&categoryId=&priorityId=&search=
    // Employees see only their own tickets; Agents/Managers/Admins see all (filtered).
    [HttpGet]
    public async Task<ActionResult<List<TicketResponseDto>>> GetTickets([FromQuery] TicketFilterDto filter)
    {
        var tickets = await _ticketService.GetTicketsAsync(User.GetUserId(), User.GetRole(), filter);
        return Ok(tickets);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TicketResponseDto>> GetTicketById(int id)
    {
        try
        {
            var ticket = await _ticketService.GetTicketByIdAsync(id, User.GetUserId(), User.GetRole());
            return ticket is null ? NotFound() : Ok(ticket);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPost]
    public async Task<ActionResult<TicketResponseDto>> CreateTicket(TicketCreateDto request)
    {
        try
        {
            var ticket = await _ticketService.CreateTicketAsync(request, User.GetUserId());
            return CreatedAtAction(nameof(GetTicketById), new { id = ticket.TicketId }, ticket);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TicketResponseDto>> UpdateTicket(int id, TicketUpdateDto request)
    {
        try
        {
            var ticket = await _ticketService.UpdateTicketAsync(id, request, User.GetUserId(), User.GetRole());
            return Ok(ticket);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    [HttpPut("{id:int}/assign")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<ActionResult<TicketResponseDto>> AssignTicket(
    int id,
    [FromBody] AssignTicketDto request)
    {
        try
        {
            var ticket = await _ticketService.AssignTicketAsync(
                id,
                request.AssignedToUserId,
                User.GetUserId(),
                User.GetRole());

            return Ok(ticket);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTicket(int id)
    {
        try
        {
            await _ticketService.DeleteTicketAsync(id, User.GetUserId(), User.GetRole());
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
