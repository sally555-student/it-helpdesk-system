using HelpDesk.Api.Data;
using HelpDesk.Api.Models;

namespace HelpDesk.Api.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _dbContext;

    public AuditLogService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task LogAsync(
        int? userId,
        string action,
        string entityType,
        int? entityId,
        string description,
        string? oldValue = null,
        string? newValue = null,
        string? ipAddress = null)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Description = description,
            OldValue = oldValue,
            NewValue = newValue,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.AuditLogs.Add(log);

        await _dbContext.SaveChangesAsync();
    }
}