namespace HelpDesk.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(
        int? userId,
        string action,
        string entityType,
        int? entityId,
        string description,
        string? oldValue = null,
        string? newValue = null,
        string? ipAddress = null);
}