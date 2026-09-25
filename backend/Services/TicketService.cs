using HelpDesk.Api.Data;
using HelpDesk.Api.Dtos;
using HelpDesk.Api.Helpers;
using HelpDesk.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HelpDesk.Api.Services;

public class TicketService : ITicketService
{
    private readonly AppDbContext _dbContext;
   
    private readonly IAuditLogService _auditLogService;

    // IDs match the seed data in AppDbContext.OnModelCreating (and schema.sql).
    // If you ever re-seed with different IDs, update these too.
    private const int OpenStatusId = 1;
    private const int ResolvedStatusId = 4;
    private const int ClosedStatusId = 5;

    public TicketService(
    AppDbContext dbContext,
    IAuditLogService auditLogService)
    {
        _dbContext = dbContext;
        _auditLogService = auditLogService;
    }

    public async Task<List<TicketResponseDto>> GetTicketsAsync(
    int currentUserId, string currentUserRole, TicketFilterDto filter)
    {
        var query = TicketsWithIncludes();

        // Employee → only tickets created by himself
        if (currentUserRole == Roles.Employee)
        {
            query = query.Where(t => t.CreatedByUserId == currentUserId);
        }

        // Agent → only:
        // 1. Tickets assigned to him
        // 2. Open tickets that are not assigned yet
        else if (currentUserRole == Roles.Agent)
        {
            query = query.Where(t =>
                t.AssignedToUserId == currentUserId ||
                (t.AssignedToUserId == null && t.StatusId == OpenStatusId) ||
                 (
            t.AssignedToUserId == null &&
            t.Status.StatusName == "Pending" &&
            _dbContext.TicketAssignmentRequests.Any(r =>
                r.TicketId == t.TicketId &&
                r.AgentId == currentUserId &&
                r.Status == "Pending")
            ));
            
        }

        // Manager/Admin → see all tickets
        else if (currentUserRole == Roles.Manager ||
                 currentUserRole == Roles.Admin)
        {
            // No additional filter
        }

        // Unknown role
        else
        {
            throw new UnauthorizedAccessException(
                "You don't have permission to view tickets."
            );
        }

        if (filter.StatusId is not null)
        {
            query = query.Where(t => t.StatusId == filter.StatusId);
        }

        if (filter.CategoryId is not null)
        {
            query = query.Where(t => t.CategoryId == filter.CategoryId);
        }

        if (filter.PriorityId is not null)
        {
            query = query.Where(t => t.PriorityId == filter.PriorityId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim();

            query = query.Where(t =>
                t.Title.Contains(search) ||
                t.Description.Contains(search) ||
                t.TicketReference.Contains(search));
        }
       
        var tickets = await query
            .OrderByDescending(t => t.CreatedDate)
            .ToListAsync();

        return tickets.Select(MapToResponseDto).ToList();
    }

    public async Task<TicketResponseDto?> GetTicketByIdAsync(
        int ticketId, int currentUserId, string currentUserRole)
    {
        var ticket = await TicketsWithIncludes().FirstOrDefaultAsync(t => t.TicketId == ticketId);
        if (ticket is null)
        {
            return null;
        }

        if (currentUserRole == Roles.Employee && ticket.CreatedByUserId != currentUserId)
        {
            throw new UnauthorizedAccessException("You can only view tickets you created.");
        }

        return MapToResponseDto(ticket);
    }

    public async Task<TicketResponseDto> CreateTicketAsync(TicketCreateDto request, int currentUserId)
    {
        await ValidateCategoryAndPriorityAsync(request.CategoryId, request.PriorityId);

        var ticket = new Ticket
        {
            TicketReference = await GenerateTicketReferenceAsync(),
            Title = request.Title,
            Description = request.Description,
            CategoryId = request.CategoryId,
            PriorityId = request.PriorityId,
            StatusId = OpenStatusId,
            CreatedByUserId = currentUserId,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Tickets.Add(ticket);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync(
            userId: currentUserId,
            action: "Created Ticket",
            entityType: "Ticket",
            entityId: ticket.TicketId,
            description: $"Created ticket {ticket.TicketReference}: {ticket.Title}"
        );

        var created = await TicketsWithIncludes()
            .FirstAsync(t => t.TicketId == ticket.TicketId);

        return MapToResponseDto(created);
    }

    public async Task<TicketResponseDto> UpdateTicketAsync(
    int ticketId,
    TicketUpdateDto request,
    int currentUserId,
    string currentUserRole)
    {
        var ticket = await _dbContext.Tickets
            .FirstOrDefaultAsync(t => t.TicketId == ticketId)
            ?? throw new KeyNotFoundException("Ticket not found.");
        var oldCategoryId = ticket.CategoryId;
        var oldPriorityId = ticket.PriorityId;
        var oldStatusId = ticket.StatusId;
        var oldAssignedToUserId = ticket.AssignedToUserId;
        var oldTitle = ticket.Title;
        var oldDescription = ticket.Description;

        bool isOwner = ticket.CreatedByUserId == currentUserId;

        // =========================================================
        // EMPLOYEE
        // =========================================================
        if (currentUserRole == Roles.Employee)
        {
            if (!isOwner)
            {
                throw new UnauthorizedAccessException(
                    "You can only edit tickets you created.");
            }

            if (ticket.StatusId != OpenStatusId)
            {
                throw new InvalidOperationException(
                    "This ticket is already being worked on and can no longer be edited by you.");
            }

            await ValidateCategoryAndPriorityAsync(
                request.CategoryId,
                request.PriorityId);

            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.CategoryId = request.CategoryId;
            ticket.PriorityId = request.PriorityId;

            // Employee cannot change status or assignment
        }

        // =========================================================
        // AGENT
        // =========================================================
        else if (currentUserRole == Roles.Agent)
        {
            // Agent can only work on:
            // - tickets assigned to him
            // - unassigned Open tickets
            bool canWorkOnTicket =
                ticket.AssignedToUserId == currentUserId ||
                (ticket.AssignedToUserId == null &&
                 ticket.StatusId == OpenStatusId);

            if (!canWorkOnTicket)
            {
                throw new UnauthorizedAccessException(
                    "You can only work on tickets assigned to you or open unassigned tickets.");
            }

            await ValidateCategoryAndPriorityAsync(
                request.CategoryId,
                request.PriorityId);

            var newStatus = await _dbContext.Statuses.FindAsync(request.StatusId)
                ?? throw new ArgumentException("Invalid status.");

            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.CategoryId = request.CategoryId;
            ticket.PriorityId = request.PriorityId;

            ApplyStatusChange(ticket, newStatus.StatusId);
        }

        // =========================================================
        // MANAGER
        // =========================================================
        else if (currentUserRole == Roles.Manager)
        {
            await ValidateCategoryAndPriorityAsync(
                request.CategoryId,
                request.PriorityId);

            var newStatus = await _dbContext.Statuses.FindAsync(request.StatusId)
                ?? throw new ArgumentException("Invalid status.");

            // Manager can assign an agent
            if (request.AssignedToUserId.HasValue)
            {
                var agent = await _dbContext.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u =>
                        u.UserId == request.AssignedToUserId.Value &&
                        u.IsActive);

                if (agent == null || agent.Role.RoleName != Roles.Agent)
                {
                    throw new ArgumentException(
                        "The selected user is not a valid active IT Agent.");
                }
            }

            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.CategoryId = request.CategoryId;
            ticket.PriorityId = request.PriorityId;
            ticket.AssignedToUserId = request.AssignedToUserId;

            ApplyStatusChange(ticket, newStatus.StatusId);
        }

        // =========================================================
        // ADMIN
        // =========================================================
        else if (currentUserRole == Roles.Admin)
        {
            await ValidateCategoryAndPriorityAsync(
                request.CategoryId,
                request.PriorityId);

            var newStatus = await _dbContext.Statuses.FindAsync(request.StatusId)
                ?? throw new ArgumentException("Invalid status.");

            // Admin can assign anyone who is an Agent
            if (request.AssignedToUserId.HasValue)
            {
                var agent = await _dbContext.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u =>
                        u.UserId == request.AssignedToUserId.Value &&
                        u.IsActive);

                if (agent == null || agent.Role.RoleName != Roles.Agent)
                {
                    throw new ArgumentException(
                        "The selected user is not a valid active IT Agent.");
                }
            }

            ticket.Title = request.Title;
            ticket.Description = request.Description;
            ticket.CategoryId = request.CategoryId;
            ticket.PriorityId = request.PriorityId;
            ticket.AssignedToUserId = request.AssignedToUserId;

            ApplyStatusChange(ticket, newStatus.StatusId);
        }

        else
        {
            throw new UnauthorizedAccessException(
                "You don't have permission to edit this ticket.");
        }

        // Handle working time tracking fields
        if (request.TotalWorkingSeconds.HasValue)
        {
            var requestedSeconds = request.TotalWorkingSeconds.Value;

            // Protect the database from invalid timestamp-like values.
            if (requestedSeconds < 0 || requestedSeconds > 7_776_000)
            {
                throw new ArgumentException(
                    "Invalid working time value.");
            }

            ticket.WorkingStartedAt = request.WorkingStartedAt;
            ticket.WorkingFinishedAt = request.WorkingFinishedAt;
            ticket.TotalWorkingSeconds = requestedSeconds;
            ticket.IsPaused = request.IsPaused;
        }
        else
        {
            // Manual edit fallback:
            if (ticket.StatusId == 2) // In Progress
            {
                if (ticket.WorkingStartedAt == null)
                {
                    ticket.WorkingStartedAt = DateTime.UtcNow;
                }
                ticket.IsPaused = ticket.IsPaused ?? false;
            }
            else if (ticket.StatusId == 4 || ticket.StatusId == 5) // Resolved / Closed
            {
                if (ticket.WorkingFinishedAt == null)
                {
                    ticket.WorkingFinishedAt = DateTime.UtcNow;
                }
                if (ticket.WorkingStartedAt != null && (ticket.TotalWorkingSeconds == null || ticket.TotalWorkingSeconds == 0))
                {
                    ticket.TotalWorkingSeconds = (int)(DateTime.UtcNow - ticket.WorkingStartedAt.Value).TotalSeconds;
                }
            }
            else if (ticket.StatusId == 1) // Open
            {
                ticket.WorkingStartedAt = null;
                ticket.WorkingFinishedAt = null;
                ticket.TotalWorkingSeconds = null;
                ticket.IsPaused = null;
            }
        }

        ticket.UpdatedDate = DateTime.UtcNow;
        

        await _dbContext.SaveChangesAsync();
        if (oldAssignedToUserId != ticket.AssignedToUserId)
        {
            var oldAgentName = oldAssignedToUserId.HasValue
                ? await _dbContext.Users
                    .Where(u => u.UserId == oldAssignedToUserId.Value)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync()
                : null;

            var newAgentName = ticket.AssignedToUserId.HasValue
                ? await _dbContext.Users
                    .Where(u => u.UserId == ticket.AssignedToUserId.Value)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync()
                : null;

            await _auditLogService.LogAsync(
                userId: currentUserId,
                action: "Assigned Ticket",
                entityType: "Ticket",
                entityId: ticket.TicketId,
                description:
                    $"Changed assignment of {ticket.TicketReference}",
                oldValue: oldAgentName ?? "Unassigned",
                newValue: newAgentName ?? "Unassigned"
            );
        }
        if (oldTitle != ticket.Title ||
    oldDescription != ticket.Description)
        {
            await _auditLogService.LogAsync(
                userId: currentUserId,
                action: "Updated Ticket",
                entityType: "Ticket",
                entityId: ticket.TicketId,
                description:
                    $"Updated ticket {ticket.TicketReference}",
                oldValue:
                    $"Title: {oldTitle}",
                newValue:
                    $"Title: {ticket.Title}"
            );
        }
        if (oldStatusId != ticket.StatusId)
        {
            var oldStatus = await _dbContext.Statuses
                .Where(s => s.StatusId == oldStatusId)
                .Select(s => s.StatusName)
                .FirstOrDefaultAsync();

            var newStatus = await _dbContext.Statuses
                .Where(s => s.StatusId == ticket.StatusId)
                .Select(s => s.StatusName)
                .FirstOrDefaultAsync();

            await _auditLogService.LogAsync(
                userId: currentUserId,
                action: "Changed Status",
                entityType: "Ticket",
                entityId: ticket.TicketId,
                description:
                    $"Changed status of {ticket.TicketReference}",
                oldValue: oldStatus,
                newValue: newStatus
            );
        }
        if (oldCategoryId != ticket.CategoryId)
        {
            var oldCategory = await _dbContext.Categories
                .Where(c => c.CategoryId == oldCategoryId)
                .Select(c => c.CategoryName)
                .FirstOrDefaultAsync();

            var newCategory = await _dbContext.Categories
                .Where(c => c.CategoryId == ticket.CategoryId)
                .Select(c => c.CategoryName)
                .FirstOrDefaultAsync();

            await _auditLogService.LogAsync(
                userId: currentUserId,
                action: "Changed Category",
                entityType: "Ticket",
                entityId: ticket.TicketId,
                description:
                    $"Changed category of {ticket.TicketReference}",
                oldValue: oldCategory,
                newValue: newCategory
            );
        }
        if (oldPriorityId != ticket.PriorityId)
        {
            var oldPriority = await _dbContext.Priorities
                .Where(p => p.PriorityId == oldPriorityId)
                .Select(p => p.PriorityName)
                .FirstOrDefaultAsync();

            var newPriority = await _dbContext.Priorities
                .Where(p => p.PriorityId == ticket.PriorityId)
                .Select(p => p.PriorityName)
                .FirstOrDefaultAsync();

            await _auditLogService.LogAsync(
                userId: currentUserId,
                action: "Changed Priority",
                entityType: "Ticket",
                entityId: ticket.TicketId,
                description:
                    $"Changed priority of {ticket.TicketReference}",
                oldValue: oldPriority,
                newValue: newPriority
            );
        }

        return await GetTicketByIdAsync(
            ticket.TicketId,
            currentUserId,
            currentUserRole)
            ?? throw new InvalidOperationException(
                "Ticket was updated but could not be reloaded.");
    }
    public async Task<TicketResponseDto> AssignTicketAsync(
    int ticketId,
    int agentId,
    int currentUserId,
    string currentUserRole)
    {
        // Only Manager and Admin can assign tickets.
        if (currentUserRole != Roles.Manager &&
            currentUserRole != Roles.Admin)
        {
            throw new UnauthorizedAccessException(
                "Only Managers and Admins can assign tickets.");
        }

        var ticket = await _dbContext.Tickets
            .FirstOrDefaultAsync(t => t.TicketId == ticketId);

        if (ticket is null)
        {
            throw new KeyNotFoundException("Ticket not found.");
        }

        // Make sure the selected user exists,
        // is active, and is an IT Support Agent.
        var agent = await _dbContext.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u =>
                u.UserId == agentId &&
                u.IsActive);

        if (agent is null || agent.Role.RoleName != Roles.Agent)
        {
            throw new ArgumentException(
                "The selected user is not a valid active IT Support Agent.");
        }

        // Assign the ticket.
        ticket.AssignedToUserId = agent.UserId;
        ticket.UpdatedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        await _auditLogService.LogAsync(
      userId: currentUserId,
      action: "Assigned Ticket",
      entityType: "Ticket",
      entityId: ticket.TicketId,
      description:
          $"Assigned ticket {ticket.TicketReference} to {agent.FullName}"
  
);

        var updatedTicket = await TicketsWithIncludes()
            .FirstOrDefaultAsync(t => t.TicketId == ticketId);

        if (updatedTicket is null)
        {
            throw new KeyNotFoundException(
                "Ticket was assigned but could not be reloaded.");
        }

        return MapToResponseDto(updatedTicket);
    }
    public async Task DeleteTicketAsync(int ticketId, int currentUserId, string currentUserRole)
    {
        var ticket = await _dbContext.Tickets.FirstOrDefaultAsync(t => t.TicketId == ticketId)
            ?? throw new KeyNotFoundException("Ticket not found.");

        bool isOwner = ticket.CreatedByUserId == currentUserId;

        if (currentUserRole == Roles.Admin)
        {
            // Full access — Admin can delete any ticket.
        }
        else if (currentUserRole == Roles.Employee && isOwner)
        {
            if (ticket.StatusId != OpenStatusId)
            {
                throw new InvalidOperationException(
                    "Only tickets that are still Open (nobody has started work on them yet) can be canceled. " +
                    "Ask IT support to close it instead.");
            }
        }
        else
        {
            throw new UnauthorizedAccessException("You don't have permission to delete this ticket.");
        }

        _dbContext.Tickets.Remove(ticket);
        await _dbContext.SaveChangesAsync();

        await _auditLogService.LogAsync(
            userId: currentUserId,
            action: "Deleted Ticket",
            entityType: "Ticket",
            entityId: ticket.TicketId,
            description:
                $"Deleted ticket {ticket.TicketReference}: {ticket.Title}"
        );
    }

    // --- helpers ---

    private IQueryable<Ticket> TicketsWithIncludes()
    {
        return _dbContext.Tickets
            .Include(t => t.Category)
            .Include(t => t.Priority)
            .Include(t => t.Status)
            .Include(t => t.CreatedByUser)
            .Include(t => t.AssignedToUser)
            .AsQueryable();
    }

    private async Task ValidateCategoryAndPriorityAsync(int categoryId, int priorityId)
    {
        bool categoryExists = await _dbContext.Categories.AnyAsync(c => c.CategoryId == categoryId);
        if (!categoryExists)
        {
            throw new ArgumentException("Invalid category.");
        }

        bool priorityExists = await _dbContext.Priorities.AnyAsync(p => p.PriorityId == priorityId);
        if (!priorityExists)
        {
            throw new ArgumentException("Invalid priority.");
        }
    }

    // Stamps ResolvedDate/ClosedDate the first time a ticket enters that status, and clears
    // them again if a staff member reopens the ticket by moving it back to an earlier status.
    private static void ApplyStatusChange(Ticket ticket, int newStatusId)
    {
        if (newStatusId == ResolvedStatusId && ticket.ResolvedDate is null)
        {
            ticket.ResolvedDate = DateTime.UtcNow;
        }
        else if (newStatusId != ResolvedStatusId)
        {
            ticket.ResolvedDate = null;
        }

        if (newStatusId == ClosedStatusId && ticket.ClosedDate is null)
        {
            ticket.ClosedDate = DateTime.UtcNow;
        }
        else if (newStatusId != ClosedStatusId)
        {
            ticket.ClosedDate = null;
        }

        ticket.StatusId = newStatusId;
    }

    // Format: TCK-{year}-{4-digit sequential number within that year}, e.g. TCK-2026-0001.
    // NOTE: this counts existing rows rather than using a DB sequence, so under simultaneous
    // concurrent creates two tickets could in theory get the same reference. Fine for an
    // internship-scale project; a production system would back this with a SQL SEQUENCE
    // or a unique constraint + retry loop.
    private async Task<string> GenerateTicketReferenceAsync()
    {
        int year = DateTime.UtcNow.Year;
        int countThisYear = await _dbContext.Tickets.CountAsync(t => t.CreatedDate.Year == year);
        int nextNumber = countThisYear + 1;
        return $"TCK-{year}-{nextNumber:D4}";
    }

    private static TicketResponseDto MapToResponseDto(Ticket t) => new()
    {
        TicketId = t.TicketId,
        TicketReference = t.TicketReference,
        Title = t.Title,
        Description = t.Description,
        CategoryId = t.CategoryId,
        PriorityId = t.PriorityId,
        StatusId = t.StatusId,
        AssignedToUserId = t.AssignedToUserId,
        CategoryName = t.Category.CategoryName,
        PriorityName = t.Priority.PriorityName,
        StatusName = t.Status.StatusName,
        AssignedToUserName = t.AssignedToUser?.FullName,
        CreatedByUserId = t.CreatedByUserId,
        CreatedByUserName = t.CreatedByUser.FullName,
        CreatedDate = t.CreatedDate,
        UpdatedDate = t.UpdatedDate,
        ResolvedDate = t.ResolvedDate,
        ClosedDate = t.ClosedDate,
        WorkingStartedAt = t.WorkingStartedAt,
        WorkingFinishedAt = t.WorkingFinishedAt,
        TotalWorkingSeconds = t.TotalWorkingSeconds,
        IsPaused = t.IsPaused
    };
}
