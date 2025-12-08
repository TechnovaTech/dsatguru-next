using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTestSessionAndResultModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FinalScores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MathScore = table.Column<int>(type: "int", nullable: false),
                    ReadingWritingScore = table.Column<int>(type: "int", nullable: false),
                    TotalScore = table.Column<int>(type: "int", nullable: false),
                    CalculationDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FinalScores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FinalScores_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "IrtCalculations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MathAbility = table.Column<double>(type: "float", nullable: false),
                    ReadingWritingAbility = table.Column<double>(type: "float", nullable: false),
                    MathStandardError = table.Column<double>(type: "float", nullable: false),
                    ReadingWritingStandardError = table.Column<double>(type: "float", nullable: false),
                    CalculationDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IrtCalculations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IrtCalculations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RouteDeterminations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DifficultyModule = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeterminationDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteDeterminations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteDeterminations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TestResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModuleType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MathScore = table.Column<int>(type: "int", nullable: false),
                    ReadingWritingScore = table.Column<int>(type: "int", nullable: false),
                    TotalScore = table.Column<int>(type: "int", nullable: false),
                    CompletionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    QuestionsAttempted = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswers = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestResults", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TestResults_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TestSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ModuleRoute = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalQuestions = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswers = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TestSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SessionQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TestSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserAnswer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TimeSpent = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessionQuestions_TestSessions_TestSessionId",
                        column: x => x.TestSessionId,
                        principalTable: "TestSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FinalScores_UserId",
                table: "FinalScores",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_IrtCalculations_UserId",
                table: "IrtCalculations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteDeterminations_UserId",
                table: "RouteDeterminations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SessionQuestions_TestSessionId",
                table: "SessionQuestions",
                column: "TestSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TestResults_UserId",
                table: "TestResults",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TestSessions_UserId",
                table: "TestSessions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FinalScores");

            migrationBuilder.DropTable(
                name: "IrtCalculations");

            migrationBuilder.DropTable(
                name: "RouteDeterminations");

            migrationBuilder.DropTable(
                name: "SessionQuestions");

            migrationBuilder.DropTable(
                name: "TestResults");

            migrationBuilder.DropTable(
                name: "TestSessions");
        }
    }
}
