using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionBankIdToQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuestionBankId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_QuestionBankId",
                table: "Questions",
                column: "QuestionBankId");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Courses_QuestionBankId",
                table: "Questions",
                column: "QuestionBankId",
                principalTable: "Courses",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Courses_QuestionBankId",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_QuestionBankId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "QuestionBankId",
                table: "Questions");
        }
    }
}
