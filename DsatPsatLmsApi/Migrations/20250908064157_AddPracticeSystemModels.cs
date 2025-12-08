using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPracticeSystemModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PracticeSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Domain = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Mode = table.Column<int>(type: "int", nullable: false),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TotalQuestions = table.Column<int>(type: "int", nullable: false),
                    CompletedQuestions = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswers = table.Column<int>(type: "int", nullable: false),
                    IncorrectAnswers = table.Column<int>(type: "int", nullable: false),
                    SkippedQuestions = table.Column<int>(type: "int", nullable: false),
                    AccuracyPercentage = table.Column<double>(type: "float", nullable: false),
                    TotalTimeSpent = table.Column<int>(type: "int", nullable: false),
                    TimeLimit = table.Column<int>(type: "int", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastActivityAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PracticeSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserQuestionStats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TotalAttempts = table.Column<int>(type: "int", nullable: false),
                    CorrectAttempts = table.Column<int>(type: "int", nullable: false),
                    IncorrectAttempts = table.Column<int>(type: "int", nullable: false),
                    SkippedAttempts = table.Column<int>(type: "int", nullable: false),
                    AccuracyRate = table.Column<double>(type: "float", nullable: false),
                    TotalTimeSpent = table.Column<int>(type: "int", nullable: false),
                    AverageTimePerAttempt = table.Column<int>(type: "int", nullable: false),
                    FastestTime = table.Column<int>(type: "int", nullable: false),
                    SlowestTime = table.Column<int>(type: "int", nullable: false),
                    MasteryLevel = table.Column<int>(type: "int", nullable: false),
                    ConsecutiveCorrect = table.Column<int>(type: "int", nullable: false),
                    ConsecutiveIncorrect = table.Column<int>(type: "int", nullable: false),
                    IsMarkedForReview = table.Column<bool>(type: "bit", nullable: false),
                    IsBookmarked = table.Column<bool>(type: "bit", nullable: false),
                    AverageConfidence = table.Column<double>(type: "float", nullable: false),
                    AveragePerceivedDifficulty = table.Column<double>(type: "float", nullable: false),
                    FirstAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastAttemptAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastCorrectAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastIncorrectAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DaysToMaster = table.Column<int>(type: "int", nullable: false),
                    HasViewedExplanation = table.Column<bool>(type: "bit", nullable: false),
                    ExplanationViews = table.Column<int>(type: "int", nullable: false),
                    IsImproving = table.Column<bool>(type: "bit", nullable: false),
                    NeedsReview = table.Column<bool>(type: "bit", nullable: false),
                    NextReviewDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserQuestionStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserQuestionStats_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserQuestionStats_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PracticeAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PracticeSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserAnswer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false),
                    IsSkipped = table.Column<bool>(type: "bit", nullable: false),
                    TimeSpent = table.Column<int>(type: "int", nullable: false),
                    QuestionOrder = table.Column<int>(type: "int", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FirstViewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ViewCount = table.Column<int>(type: "int", nullable: false),
                    AnswerChanges = table.Column<int>(type: "int", nullable: false),
                    IsBookmarked = table.Column<bool>(type: "bit", nullable: false),
                    UserNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConfidenceLevel = table.Column<int>(type: "int", nullable: true),
                    PerceivedDifficulty = table.Column<int>(type: "int", nullable: true),
                    HasViewedExplanation = table.Column<bool>(type: "bit", nullable: false),
                    ExplanationViewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsMarkedForReview = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PracticeAnswers_PracticeSessions_PracticeSessionId",
                        column: x => x.PracticeSessionId,
                        principalTable: "PracticeSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PracticeAnswers_Questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "Questions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAnswers_PracticeSessionId",
                table: "PracticeAnswers",
                column: "PracticeSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeAnswers_QuestionId",
                table: "PracticeAnswers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_UserId",
                table: "PracticeSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuestionStats_QuestionId",
                table: "UserQuestionStats",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserQuestionStats_UserId_QuestionId",
                table: "UserQuestionStats",
                columns: new[] { "UserId", "QuestionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PracticeAnswers");

            migrationBuilder.DropTable(
                name: "UserQuestionStats");

            migrationBuilder.DropTable(
                name: "PracticeSessions");
        }
    }
}
