using HelpDesk.Api.Data;
using HelpDesk.Api.Dtos;
using HelpDesk.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/tickets/{ticketId:int}/comments")]
[Authorize]
public class TicketCommentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TicketCommentsController(AppDbContext db)
    {
        _db = db;
    }

    // =========================================================
    // GET COMMENTS
    // =========================================================

    [HttpGet]
    public async Task<IActionResult> GetComments(int ticketId)
    {
        var ticketExists = await _db.Tickets
            .AnyAsync(t => t.TicketId == ticketId);

        if (!ticketExists)
            return NotFound("Ticket not found.");

        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        var query = _db.TicketComments
            .AsNoTracking()
            .Where(c => c.TicketId == ticketId);

        // Employee can only see Public comments
        if (role == "Employee")
        {
            query = query.Where(c => c.CommentType == "Public");
        }

        var comments = await query
            .OrderBy(c => c.CreatedDate)
            .Select(c => new TicketCommentDto
            {
                CommentId = c.CommentId,
                TicketId = c.TicketId,
                UserId = c.UserId,
                UserName = c.User!.FullName,
                UserRole = c.User.Role!.RoleName,
                CommentText = c.CommentText,
                CommentType = c.CommentType,
                CreatedDate = c.CreatedDate
            })
            .ToListAsync();

        return Ok(comments);
    }

    // =========================================================
    // ADD COMMENT
    // =========================================================

    [HttpPost]
    public async Task<IActionResult> AddComment(
        int ticketId,
        CreateTicketCommentRequest request)
    {
        var ticketExists = await _db.Tickets
            .AnyAsync(t => t.TicketId == ticketId);

        if (!ticketExists)
            return NotFound("Ticket not found.");

        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        var userIdClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("userId")?.Value
            ?? User.FindFirst("UserId")?.Value;

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.CommentText))
            return BadRequest("Comment cannot be empty.");

        var commentType = request.CommentType?.Trim();

        if (commentType != "Public" &&
            commentType != "Internal")
        {
            return BadRequest(
                "Comment type must be Public or Internal."
            );
        }

        // Employee is NEVER allowed to create Internal comments
        if (role == "Employee" &&
            commentType == "Internal")
        {
            return Forbid();
        }

        // Only staff can create Internal comments
        if (commentType == "Internal" &&
            role != "Admin" &&
            role != "Manager" &&
            role != "IT Support Agent")
        {
            return Forbid();
        }

        var comment = new TicketComment
        {
            TicketId = ticketId,
            UserId = userId,
            CommentText = request.CommentText.Trim(),
            CommentType = commentType,
            CreatedDate = DateTime.UtcNow
        };

        _db.TicketComments.Add(comment);

        await _db.SaveChangesAsync();

        var result = await _db.TicketComments
            .AsNoTracking()
            .Where(c => c.CommentId == comment.CommentId)
            .Select(c => new TicketCommentDto
            {
                CommentId = c.CommentId,
                TicketId = c.TicketId,
                UserId = c.UserId,
                UserName = c.User!.FullName,
                UserRole = c.User.Role!.RoleName,
                CommentText = c.CommentText,
                CommentType = c.CommentType,
                CreatedDate = c.CreatedDate
            })
            .FirstAsync();

        return Ok(result);
    }
}