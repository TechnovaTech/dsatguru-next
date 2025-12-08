using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEnhancedQuestionBank : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EnhancedQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Topic = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Subtopic = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Subject = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Options = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Points = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Tags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UsageCount = table.Column<int>(type: "int", nullable: false),
                    AverageRating = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalRatings = table.Column<int>(type: "int", nullable: false),
                    SuccessRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AverageTimeSeconds = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EnhancedQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EnhancedQuestions_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuestionAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentAnswer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false),
                    TimeSpentSeconds = table.Column<int>(type: "int", nullable: false),
                    AttemptedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_EnhancedQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "EnhancedQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QuestionAttempts_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "QuestionRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuestionRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuestionRatings_EnhancedQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "EnhancedQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_QuestionRatings_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_EnhancedQuestions_CreatedBy",
                table: "EnhancedQuestions",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_QuestionId",
                table: "QuestionAttempts",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionAttempts_StudentId",
                table: "QuestionAttempts",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionRatings_QuestionId",
                table: "QuestionRatings",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_QuestionRatings_StudentId",
                table: "QuestionRatings",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuestionAttempts");

            migrationBuilder.DropTable(
                name: "QuestionRatings");

            migrationBuilder.DropTable(
                name: "EnhancedQuestions");
        }
    }
}
