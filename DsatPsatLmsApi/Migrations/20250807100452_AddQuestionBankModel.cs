using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionBankModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuestionBankId",
                table: "EnhancedQuestions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "QuestionBanks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Subject = table.Column<int>(type: "int", nullable: false),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionBanks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionBanks_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EnhancedQuestions_QuestionBankId",
                table: "EnhancedQuestions",
                column: "QuestionBankId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionBanks_CreatedBy",
                table: "QuestionBanks",
                column: "CreatedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_EnhancedQuestions_QuestionBanks_QuestionBankId",
                table: "EnhancedQuestions",
                column: "QuestionBankId",
                principalTable: "QuestionBanks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EnhancedQuestions_QuestionBanks_QuestionBankId",
                table: "EnhancedQuestions");

            migrationBuilder.DropTable(
                name: "QuestionBanks");

            migrationBuilder.DropIndex(
                name: "IX_EnhancedQuestions_QuestionBankId",
                table: "EnhancedQuestions");

            migrationBuilder.DropColumn(
                name: "QuestionBankId",
                table: "EnhancedQuestions");
        }
    }
}
