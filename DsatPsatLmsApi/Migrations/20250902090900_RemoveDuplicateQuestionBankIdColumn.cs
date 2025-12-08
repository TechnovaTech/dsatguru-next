using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDuplicateQuestionBankIdColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Courses_QuestionBankId1",
                table: "Questions");

            migrationBuilder.DropIndex(
                name: "IX_Questions_QuestionBankId1",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "QuestionBankId1",
                table: "Questions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuestionBankId1",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_QuestionBankId1",
                table: "Questions",
                column: "QuestionBankId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Questions_Courses_QuestionBankId1",
                table: "Questions",
                column: "QuestionBankId1",
                principalTable: "Courses",
                principalColumn: "Id");
        }
    }
}
