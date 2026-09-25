using HelpDesk.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public AuditLogController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // =========================================================
    // GET ALL ACTIVITY LOGS
    // Admin and Manager only
    // =========================================================

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllLogs()
    {
        var logs = await _dbContext.AuditLogs
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.AuditLogId,

                a.UserId,

                UserName = a.User != null
                    ? a.User.FullName
                    : "System",

                a.Action,
                a.EntityType,
                a.EntityId,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.IpAddress,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    // =========================================================
    // GET ACTIVITY LOGS FOR CURRENT USER
    // =========================================================

    [HttpGet("me")]
    public async Task<IActionResult> GetMyLogs()
    {
        var userIdClaim = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier);

        if (userIdClaim is null)
        {
            return Unauthorized();
        }

        if (!int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized();
        }

        var logs = await _dbContext.AuditLogs
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.AuditLogId,
                a.UserId,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.IpAddress,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }

    // =========================================================
    // GET ACTIVITY LOGS FOR A SPECIFIC USER
    // ADMIN ONLY
    // =========================================================

    [HttpGet("user/{userId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetUserLogs(int userId)
    {
        var userExists = await _dbContext.Users
            .AnyAsync(u => u.UserId == userId);

        if (!userExists)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        var logs = await _dbContext.AuditLogs
            .Include(a => a.User)
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.AuditLogId,

                a.UserId,

                UserName = a.User != null
                    ? a.User.FullName
                    : "System",

                a.Action,
                a.EntityType,
                a.EntityId,
                a.Description,
                a.OldValue,
                a.NewValue,
                a.IpAddress,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }
}

