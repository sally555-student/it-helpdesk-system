
using HelpDesk.Api.Data;
using HelpDesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Controllers;

public class UpdateProfileRequest
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? Department { get; set; }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public UserController(
        AppDbContext dbContext,
        IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    // =========================================================
    // UPDATE PROFILE PHOTO
    // =========================================================

    public class UpdateProfilePhotoRequest
    {
        public string? ProfileImageUrl { get; set; }
    }

    [HttpPut("me/photo")]
    public async Task<IActionResult> UpdateProfilePhoto(
        [FromBody] UpdateProfilePhotoRequest request)
    {
        var userId = GetCurrentUserId();

        if (userId == null)
        {
            return Unauthorized(new
            {
                message = "User is not authenticated."
            });
        }

        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId.Value);

        if (user == null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        if (request == null ||
            string.IsNullOrWhiteSpace(request.ProfileImageUrl))
        {
            return BadRequest(new
            {
                message = "Profile image is required."
            });
        }

        user.ProfileImageUrl = request.ProfileImageUrl.Trim();

        user.ProfileUpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            user.UserId,
            user.FullName,
            user.Email,
            user.Department,
            user.IsActive,

            RoleName = user.Role.RoleName,

            user.ProfileImageUrl,

            user.CreatedDate,
            user.LastLoginDate,
            user.PasswordChangedDate,
            user.ProfileUpdatedDate
        });
    }

    // =========================================================
    // GET ALL USERS
    // Admin and Manager only
    // =========================================================

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _dbContext.Users
            .Include(u => u.Role)
            .Select(u => new
            {
                u.UserId,
                u.FullName,
                u.Email,
                RoleName = u.Role.RoleName,
                u.Department,
                u.IsActive
            })
            .ToListAsync();

        return Ok(users);
    }

    // =========================================================
    // GET CURRENT USER PROFILE
    // =========================================================
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = GetCurrentUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var user = await _dbContext.Users
            .Include(u => u.Role)
            .Where(u => u.UserId == userId.Value)
            .Select(u => new
            {
                u.UserId,
                u.FullName,
                u.Email,
                u.Department,

                RoleName = u.Role.RoleName,

                // IMPORTANT
                u.ProfileImageUrl,

                u.CreatedDate,
                u.LastLoginDate,
                u.PasswordChangedDate,
                u.ProfileUpdatedDate
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        return Ok(user);
    }
    // =========================================================
    // UPDATE CURRENT USER PROFILE
    // =========================================================

    [HttpPut("me")]
    public async Task<IActionResult> UpdateCurrentUser(
        [FromBody] UpdateProfileRequest request)
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

        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user is null)
        {
            return NotFound();
        }

        // Validate full name
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new
            {
                message = "Full name is required."
            });
        }

        // Validate email
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new
            {
                message = "Email is required."
            });
        }

        // Check if another user already uses this email
        var emailExists = await _dbContext.Users
            .AnyAsync(u =>
                u.UserId != userId &&
                u.Email == request.Email.Trim());

        if (emailExists)
        {
            return Conflict(new
            {
                message = "This email is already used by another account."
            });
        }

        // Keep old values for audit
        var oldFullName = user.FullName;
        var oldEmail = user.Email;
        var oldDepartment = user.Department;

        // Update profile
        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim();

        user.Department =
            string.IsNullOrWhiteSpace(request.Department)
                ? null
                : request.Department.Trim();

        user.ProfileUpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        // =====================================================
        // AUDIT LOG
        // =====================================================

        var currentUserId = GetCurrentUserId();

        await _auditLogService.LogAsync(
            userId: currentUserId,
            action: "Updated Profile",
            entityType: "User",
            entityId: user.UserId,
            description:
                $"Updated profile for user \"{user.FullName}\".",
            oldValue:
                $"FullName: {oldFullName}, Email: {oldEmail}, Department: {oldDepartment}",
            newValue:
                $"FullName: {user.FullName}, Email: {user.Email}, Department: {user.Department}"
        );

        // =====================================================
        // RETURN UPDATED USER
        // =====================================================

        return Ok(new
        {
            user.UserId,
            user.FullName,
            user.Email,
            user.Department,
            user.IsActive,

            RoleName = user.Role.RoleName,

            CreatedDate = user.CreatedDate,
            LastLoginDate = user.LastLoginDate,
            PasswordChangedDate = user.PasswordChangedDate,
            ProfileUpdatedDate = user.ProfileUpdatedDate
        });
    }

    // =========================================================
    // GET AGENTS
    // Admin, Manager and IT Support Agent
    // =========================================================

    [HttpGet("agents")]
    [Authorize(Roles = "Admin,Manager,IT Support Agent")]
    public async Task<IActionResult> GetAgents()
    {
        var agents = await _dbContext.Users
            .Include(u => u.Role)
            .Where(u =>
                u.Role.RoleName == "IT Support Agent" &&
                u.IsActive)
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.UserId,
                u.FullName
            })
            .ToListAsync();

        return Ok(agents);
    }

    // =========================================================
    // ENABLE / DISABLE USER
    // ADMIN ONLY
    // =========================================================

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserStatus(
        int id,
        [FromBody] UpdateUserStatusRequest request)
    {
        var user = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == id);

        // IMPORTANT:
        // Check null BEFORE accessing user.IsActive
        if (user is null)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        var oldIsActive = user.IsActive;

        // Prevent admin from disabling themselves
        var currentUserIdClaim = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier);

        if (currentUserIdClaim is not null &&
            int.TryParse(
                currentUserIdClaim.Value,
                out int currentUserId) &&
            currentUserId == id &&
            !request.IsActive)
        {
            return BadRequest(new
            {
                message = "You cannot disable your own account."
            });
        }

        // Update status
        user.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();

        // =====================================================
        // AUDIT LOG
        // =====================================================

        await _auditLogService.LogAsync(
            userId: GetCurrentUserId(),
            action: request.IsActive
                ? "Enabled User"
                : "Disabled User",
            entityType: "User",
            entityId: user.UserId,
            description:
                $"{(request.IsActive ? "Enabled" : "Disabled")} user \"{user.FullName}\".",
            oldValue:
                oldIsActive ? "Active" : "Inactive",
            newValue:
                request.IsActive ? "Active" : "Inactive"
        );

        // =====================================================
        // RETURN RESULT
        // =====================================================

        return Ok(new
        {
            message = request.IsActive
                ? "User account enabled successfully."
                : "User account disabled successfully.",

            user.UserId,
            user.FullName,
            user.Email,
            user.Department,
            user.IsActive,

            RoleName = user.Role.RoleName
        });
    }

    // =========================================================
    // REQUEST MODEL FOR ENABLE / DISABLE
    // =========================================================

    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    // =========================================================
    // GET CURRENT USER ID FROM JWT
    // =========================================================

    private int? GetCurrentUserId()
    {
        var userIdClaim =
            User.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier)
            ?? User.FindFirst("userId")
            ?? User.FindFirst("sub");

        if (userIdClaim == null)
        {
            return null;
        }

        return int.TryParse(
            userIdClaim.Value,
            out var userId)
            ? userId
            : null;
    }
}


