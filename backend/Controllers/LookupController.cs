using HelpDesk.Api.Data;
using HelpDesk.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Controllers;

// Read-only reference data for populating the ticket create/edit forms.
// Full admin management of these lists (add/rename/delete a category) is a later
// Admin Panel deliverable — for now they're seeded fixed lists from Week 1.
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LookupController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public LookupController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET /api/lookup — everything the ticket forms need in one call.
    [HttpGet]
    public async Task<ActionResult<LookupResponseDto>> GetAll()
    {
        var result = new LookupResponseDto
        {
            Categories = await _dbContext.Categories
                .OrderBy(c => c.CategoryName)
                .Select(c => new CategoryDto { CategoryId = c.CategoryId, CategoryName = c.CategoryName })
                .ToListAsync(),
            Priorities = await _dbContext.Priorities
                .OrderBy(p => p.SortOrder)
                .Select(p => new PriorityDto { PriorityId = p.PriorityId, PriorityName = p.PriorityName, SortOrder = p.SortOrder })
                .ToListAsync(),
            Statuses = await _dbContext.Statuses
                .OrderBy(s => s.SortOrder)
                .Select(s => new StatusDto { StatusId = s.StatusId, StatusName = s.StatusName, SortOrder = s.SortOrder })
                .ToListAsync()
        };

        return Ok(result);
    }
}
