using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketWorkingTimeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPaused",
                table: "Ticket",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalWorkingSeconds",
                table: "Ticket",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WorkingFinishedAt",
                table: "Ticket",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WorkingStartedAt",
                table: "Ticket",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPaused",
                table: "Ticket");

            migrationBuilder.DropColumn(
                name: "TotalWorkingSeconds",
                table: "Ticket");

            migrationBuilder.DropColumn(
                name: "WorkingFinishedAt",
                table: "Ticket");

            migrationBuilder.DropColumn(
                name: "WorkingStartedAt",
                table: "Ticket");
        }
    }
}
