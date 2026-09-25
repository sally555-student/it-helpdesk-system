using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HelpDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixTicketAssignmentRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketAssignmentRequest_User_RequestedByUserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketAssignmentRequest_User_UserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropForeignKey(
                name: "FK_TicketAssignmentRequest_User_UserId1",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropIndex(
                name: "IX_TicketAssignmentRequest_RequestedByUserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropIndex(
                name: "IX_TicketAssignmentRequest_UserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropColumn(
                name: "RequestedByUserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.RenameColumn(
                name: "UserId1",
                table: "TicketAssignmentRequest",
                newName: "ReviewedByUserId");

            migrationBuilder.RenameColumn(
                name: "RespondedDate",
                table: "TicketAssignmentRequest",
                newName: "ReviewedAt");

            migrationBuilder.RenameColumn(
                name: "CreatedDate",
                table: "TicketAssignmentRequest",
                newName: "RequestedAt");

            migrationBuilder.RenameIndex(
                name: "IX_TicketAssignmentRequest_UserId1",
                table: "TicketAssignmentRequest",
                newName: "IX_TicketAssignmentRequest_ReviewedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAssignmentRequest_User_ReviewedByUserId",
                table: "TicketAssignmentRequest",
                column: "ReviewedByUserId",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TicketAssignmentRequest_User_ReviewedByUserId",
                table: "TicketAssignmentRequest");

            migrationBuilder.RenameColumn(
                name: "ReviewedByUserId",
                table: "TicketAssignmentRequest",
                newName: "UserId1");

            migrationBuilder.RenameColumn(
                name: "ReviewedAt",
                table: "TicketAssignmentRequest",
                newName: "RespondedDate");

            migrationBuilder.RenameColumn(
                name: "RequestedAt",
                table: "TicketAssignmentRequest",
                newName: "CreatedDate");

            migrationBuilder.RenameIndex(
                name: "IX_TicketAssignmentRequest_ReviewedByUserId",
                table: "TicketAssignmentRequest",
                newName: "IX_TicketAssignmentRequest_UserId1");

            migrationBuilder.AddColumn<int>(
                name: "RequestedByUserId",
                table: "TicketAssignmentRequest",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "TicketAssignmentRequest",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_RequestedByUserId",
                table: "TicketAssignmentRequest",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketAssignmentRequest_UserId",
                table: "TicketAssignmentRequest",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAssignmentRequest_User_RequestedByUserId",
                table: "TicketAssignmentRequest",
                column: "RequestedByUserId",
                principalTable: "User",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAssignmentRequest_User_UserId",
                table: "TicketAssignmentRequest",
                column: "UserId",
                principalTable: "User",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_TicketAssignmentRequest_User_UserId1",
                table: "TicketAssignmentRequest",
                column: "UserId1",
                principalTable: "User",
                principalColumn: "UserId");
        }
    }
}
