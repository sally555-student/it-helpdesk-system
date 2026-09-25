using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketAssignmentRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TicketAssignmentRequest",
                columns: table => new
                {
                    RequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TicketId = table.Column<int>(type: "int", nullable: false),
                    AgentId = table.Column<int>(type: "int", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RespondedDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    UserId1 = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketAssignmentRequest", x => x.RequestId);
                    table.ForeignKey(
                        name: "FK_TicketAssignmentRequest_Ticket_TicketId",
                        column: x => x.TicketId,
                        principalTable: "Ticket",
                        principalColumn: "TicketId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketAssignmentRequest_User_AgentId",
                        column: x => x.AgentId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketAssignmentRequest_User_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketAssignmentRequest_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_TicketAssignmentRequest_User_UserId1",
                        column: x => x.UserId1,
                        principalTable: "User",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_AgentId",
                table: "TicketAssignmentRequest",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_RequestedByUserId",
                table: "TicketAssignmentRequest",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_TicketId",
                table: "TicketAssignmentRequest",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_UserId",
                table: "TicketAssignmentRequest",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_UserId1",
                table: "TicketAssignmentRequest",
                column: "UserId1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TicketAssignmentRequest");
        }
    }
}
