using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveQuestionBankFromStudyPlanModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Questions_Courses_QuestionBankId",
                table: "Questions");

            migrationBuilder.DropForeignKey(
                name: "FK_StudyPlanModules_Courses_QuestionBankId",
                table: "StudyPlanModules");

            migrationBuilder.DropIndex(
                name: "IX_StudyPlanModules_QuestionBankId",
                table: "StudyPlanModules");

            migrationBuilder.DropIndex(
                name: "IX_Questions_QuestionBankId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "QuestionBankId",
                table: "StudyPlanModules");

            migrationBuilder.DropColumn(
                name: "QuestionBankId",
                table: "Questions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "QuestionBankId",
                table: "StudyPlanModules",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "QuestionBankId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanModules_QuestionBankId",
                table: "StudyPlanModules",
                column: "QuestionBankId");

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

            migrationBuilder.AddForeignKey(
                name: "FK_StudyPlanModules_Courses_QuestionBankId",
                table: "StudyPlanModules",
                column: "QuestionBankId",
                principalTable: "Courses",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
