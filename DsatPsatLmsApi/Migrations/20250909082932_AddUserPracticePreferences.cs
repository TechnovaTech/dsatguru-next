using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPracticePreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Score",
                table: "PracticeSessions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "UserPracticePreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreferredSubject = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreferredDifficulty = table.Column<int>(type: "int", nullable: true),
                    PreferredMode = table.Column<int>(type: "int", nullable: false),
                    PreferredQuestionCount = table.Column<int>(type: "int", nullable: false),
                    PreferredDomains = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PreferredStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPracticePreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPracticePreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserPracticePreferences_UserId",
                table: "UserPracticePreferences",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserPracticePreferences");

            migrationBuilder.DropColumn(
                name: "Score",
                table: "PracticeSessions");
        }
    }
}
