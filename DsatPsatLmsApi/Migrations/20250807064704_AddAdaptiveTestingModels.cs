using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAdaptiveTestingModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdaptiveConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConfigName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LowDifficultyPercentage = table.Column<int>(type: "int", nullable: false),
                    MediumDifficultyPercentage = table.Column<int>(type: "int", nullable: false),
                    HighDifficultyPercentage = table.Column<int>(type: "int", nullable: false),
                    BaseTestDuration = table.Column<int>(type: "int", nullable: false),
                    Adaptive1Duration = table.Column<int>(type: "int", nullable: false),
                    Adaptive2Duration = table.Column<int>(type: "int", nullable: false),
                    MaxRetakeAttempts = table.Column<int>(type: "int", nullable: false),
                    RetakeCooldownHours = table.Column<int>(type: "int", nullable: false),
                    LowToMediumThreshold = table.Column<int>(type: "int", nullable: false),
                    MediumToHighThreshold = table.Column<int>(type: "int", nullable: false),
                    QuestionsPerAdaptiveTest = table.Column<int>(type: "int", nullable: false),
                    BaseTestWeight = table.Column<int>(type: "int", nullable: false),
                    AdaptiveTestWeight = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdaptiveConfigs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AdaptiveConfigs_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "TestAttempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdaptiveConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BaseTestSessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Adaptive1SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Adaptive2SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CurrentLevel = table.Column<int>(type: "int", nullable: false),
                    RoutedLevel = table.Column<int>(type: "int", nullable: true),
                    BaseTestScore = table.Column<int>(type: "int", nullable: true),
                    BaseTestPercentage = table.Column<double>(type: "float", nullable: true),
                    Adaptive1Score = table.Column<int>(type: "int", nullable: true),
                    Adaptive1Percentage = table.Column<double>(type: "float", nullable: true),
                    Adaptive2Score = table.Column<int>(type: "int", nullable: true),
                    Adaptive2Percentage = table.Column<double>(type: "float", nullable: true),
                    FinalMathScore = table.Column<int>(type: "int", nullable: true),
                    FinalReadingWritingScore = table.Column<int>(type: "int", nullable: true),
                    FinalTotalScore = table.Column<int>(type: "int", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalTimeSpent = table.Column<int>(type: "int", nullable: true),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    IsRetake = table.Column<bool>(type: "bit", nullable: false),
                    StudyPlanGenerated = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestAttempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TestAttempts_AdaptiveConfigs_AdaptiveConfigId",
                        column: x => x.AdaptiveConfigId,
                        principalTable: "AdaptiveConfigs",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TestAttempts_TestSessions_Adaptive1SessionId",
                        column: x => x.Adaptive1SessionId,
                        principalTable: "TestSessions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TestAttempts_TestSessions_Adaptive2SessionId",
                        column: x => x.Adaptive2SessionId,
                        principalTable: "TestSessions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TestAttempts_TestSessions_BaseTestSessionId",
                        column: x => x.BaseTestSessionId,
                        principalTable: "TestSessions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TestAttempts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdaptiveConfigs_CreatedBy",
                table: "AdaptiveConfigs",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_TestAttempts_Adaptive1SessionId",
                table: "TestAttempts",
                column: "Adaptive1SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAttempts_Adaptive2SessionId",
                table: "TestAttempts",
                column: "Adaptive2SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAttempts_AdaptiveConfigId",
                table: "TestAttempts",
                column: "AdaptiveConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAttempts_BaseTestSessionId",
                table: "TestAttempts",
                column: "BaseTestSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TestAttempts_UserId",
                table: "TestAttempts",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TestAttempts");

            migrationBuilder.DropTable(
                name: "AdaptiveConfigs");
        }
    }
}
