using HelpDesk.Api.Data;
using HelpDesk.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class CategoryController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IAuditLogService _auditLogService;

    public CategoryController(
     AppDbContext dbContext,
     IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    // GET /api/category
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _dbContext.Categories
            .OrderBy(c => c.CategoryName)
            .Select(c => new
            {
                categoryId = c.CategoryId,
                categoryName = c.CategoryName,
                ticketCount = c.Tickets.Count()
            })
            .ToListAsync();

        return Ok(categories);
    }

    // POST /api/category
    [HttpPost]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CategoryName))
        {
            return BadRequest(new
            {
                message = "Category name is required."
            });
        }

        var name = request.CategoryName.Trim();

        var exists = await _dbContext.Categories
            .AnyAsync(c =>
                c.CategoryName.ToLower() == name.ToLower());

        if (exists)
        {
            return Conflict(new
            {
                message = "A category with this name already exists."
            });
        }

        var category = new Models.Category
        {
            CategoryName = name
        };

        _dbContext.Categories.Add(category);

        await _dbContext.SaveChangesAsync();

        var currentUserId = GetCurrentUserId();

        await _auditLogService.LogAsync(
            userId: currentUserId,
            action: "Created Category",
            entityType: "Category",
            entityId: category.CategoryId,
            description: $"Created category \"{category.CategoryName}\""
        );

        return Ok(new
        {
            categoryId = category.CategoryId,
            categoryName = category.CategoryName,
            ticketCount = 0
        });
    }

    // DELETE /api/category/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _dbContext.Categories
            .Include(c => c.Tickets)
            .FirstOrDefaultAsync(c => c.CategoryId == id);

        if (category == null)
        {
            return NotFound(new
            {
                message = "Category not found."
            });
        }

        if (category.Tickets.Any())
        {
            return Conflict(new
            {
                message =
                    $"Category \"{category.CategoryName}\" cannot be deleted because it is used by {category.Tickets.Count} ticket(s)."
            });
        }
        var categoryName = category.CategoryName;

        _dbContext.Categories.Remove(category);

        await _dbContext.SaveChangesAsync();

        var currentUserId = GetCurrentUserId();

        await _auditLogService.LogAsync(
            userId: currentUserId,
            action: "Deleted Category",
            entityType: "Category",
            entityId: id,
            description: $"Deleted category \"{categoryName}\""
        );

        return NoContent();
    }
    private int? GetCurrentUserId()
    {
        var userIdClaim =
            User.FindFirst(
                System.Security.Claims.ClaimTypes.NameIdentifier)
            ?? User.FindFirst("userId")
            ?? User.FindFirst("sub");

        if (userIdClaim == null)
            return null;

        return int.TryParse(
            userIdClaim.Value,
            out var userId)
            ? userId
            : null;
    }
}

public class CreateCategoryRequest
{
    public string CategoryName { get; set; } = string.Empty;
}
