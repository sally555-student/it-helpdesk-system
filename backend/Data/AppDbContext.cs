using HelpDesk.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Net.Sockets;

namespace HelpDesk.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Priority> Priorities => Set<Priority>();
    public DbSet<Status> Statuses => Set<Status>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketAssignmentRequest> TicketAssignmentRequests { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<TicketComment> TicketComments { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Table names stay singular per the Week 1 SQL Server Standards,
        // even though the DbSet properties above are plural (a C#/EF convention, not a DB one).
        modelBuilder.Entity<Role>().ToTable("Role");
        modelBuilder.Entity<User>().ToTable("User");
        modelBuilder.Entity<Category>().ToTable("Category");
        modelBuilder.Entity<Priority>().ToTable("Priority");
        modelBuilder.Entity<Status>().ToTable("Status");
        modelBuilder.Entity<Ticket>().ToTable("Ticket");

        modelBuilder.Entity<Role>()
            .HasIndex(r => r.RoleName)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Category>()
            .HasIndex(c => c.CategoryName)
            .IsUnique();

        modelBuilder.Entity<Priority>()
            .HasIndex(p => p.PriorityName)
            .IsUnique();

        modelBuilder.Entity<Status>()
            .HasIndex(s => s.StatusName)
            .IsUnique();

        modelBuilder.Entity<Ticket>()
            .HasIndex(t => t.TicketReference)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Category)
            .WithMany(c => c.Tickets)
            .HasForeignKey(t => t.CategoryId);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Priority)
            .WithMany(p => p.Tickets)
            .HasForeignKey(t => t.PriorityId);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Status)
            .WithMany(s => s.Tickets)
            .HasForeignKey(t => t.StatusId);

        // Two separate FKs to User (CreatedBy / AssignedTo) — must be configured explicitly
        // and set to Restrict, otherwise SQL Server would need two cascade paths from
        // User to Ticket and refuses to create the FKs ("may cause cycles").
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.CreatedByUser)
            .WithMany(u => u.CreatedTickets)
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.AssignedToUser)
            .WithMany(u => u.AssignedTickets)
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed the four roles from Week 1 (matches schema.sql seed data)
        modelBuilder.Entity<Role>().HasData(
            new Role { RoleId = 1, RoleName = "Admin", Description = "Full system access" },
            new Role { RoleId = 2, RoleName = "IT Support Agent", Description = "Manage and resolve tickets" },
            new Role { RoleId = 3, RoleName = "Employee", Description = "Create and track tickets" },
            new Role { RoleId = 4, RoleName = "Manager", Description = "Monitor team tickets and reports" }
        );

        // Seed Category / Priority / Status — matches schema.sql seed data exactly.
        // TicketService relies on specific IDs here (e.g. "Open" = StatusId 1) via
        // named constants, so don't reorder these without updating TicketService too.
        modelBuilder.Entity<Category>().HasData(
            new Category { CategoryId = 1, CategoryName = "Hardware" },
            new Category { CategoryId = 2, CategoryName = "Software" },
            new Category { CategoryId = 3, CategoryName = "Network" },
            new Category { CategoryId = 4, CategoryName = "Email" },
            new Category { CategoryId = 5, CategoryName = "Access Request" },
            new Category { CategoryId = 6, CategoryName = "Other" }
        );

        modelBuilder.Entity<Priority>().HasData(
            new Priority { PriorityId = 1, PriorityName = "Low", SortOrder = 1 },
            new Priority { PriorityId = 2, PriorityName = "Medium", SortOrder = 2 },
            new Priority { PriorityId = 3, PriorityName = "High", SortOrder = 3 },
            new Priority { PriorityId = 4, PriorityName = "Critical", SortOrder = 4 }
        );

        modelBuilder.Entity<Status>().HasData(
            new Status { StatusId = 1, StatusName = "Open", SortOrder = 1 },
            new Status { StatusId = 2, StatusName = "In Progress", SortOrder = 2 },
            new Status { StatusId = 3, StatusName = "Pending", SortOrder = 3 },
            new Status { StatusId = 4, StatusName = "Resolved", SortOrder = 4 },
            new Status { StatusId = 5, StatusName = "Closed", SortOrder = 5 }
        );
        modelBuilder.Entity<TicketAssignmentRequest>()
    .ToTable("TicketAssignmentRequest");

        modelBuilder.Entity<TicketAssignmentRequest>()
            .HasKey(r => r.RequestId);

        modelBuilder.Entity<TicketAssignmentRequest>()
            .HasOne(r => r.Ticket)
            .WithMany(t => t.AssignmentRequests)
            .HasForeignKey(r => r.TicketId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TicketAssignmentRequest>()
            .HasOne(r => r.Agent)
            .WithMany(u => u.AssignmentRequests)
            .HasForeignKey(r => r.AgentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TicketAssignmentRequest>()
            .HasOne(r => r.ReviewedByUser)
            .WithMany(u => u.ReviewedAssignmentRequests)
            .HasForeignKey(r => r.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AuditLog>(entity =>
    {
        entity.HasKey(a => a.AuditLogId);

        entity.Property(a => a.Action)
            .IsRequired()
            .HasMaxLength(100);

        entity.Property(a => a.EntityType)
            .IsRequired()
            .HasMaxLength(100);

        entity.Property(a => a.Description)
            .IsRequired()
            .HasMaxLength(1000);

        entity.Property(a => a.OldValue)
            .HasMaxLength(2000);

        entity.Property(a => a.NewValue)
            .HasMaxLength(2000);

        entity.Property(a => a.IpAddress)
            .HasMaxLength(45);

        entity.Property(a => a.CreatedAt)
            .IsRequired();

        entity.HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);
    });

        modelBuilder.Entity<TicketComment>(entity =>
    {
        entity.HasKey(c => c.CommentId);

        entity.Property(c => c.CommentText)
            .IsRequired()
            .HasMaxLength(4000);

        entity.Property(c => c.CommentType)
            .IsRequired()
            .HasMaxLength(20);

        entity.Property(c => c.CreatedDate)
            .IsRequired();

        entity.HasOne(c => c.Ticket)
            .WithMany()
            .HasForeignKey(c => c.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    });
    }
}
