using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStudyPlanModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StudyPlanModules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QuestionBankId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyPlanModules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyPlanModules_Courses_QuestionBankId",
                        column: x => x.QuestionBankId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PerformanceRoutings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MinScore = table.Column<int>(type: "int", nullable: false),
                    MaxScore = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerformanceRoutings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerformanceRoutings_StudyPlanModules_FromModuleId",
                        column: x => x.FromModuleId,
                        principalTable: "StudyPlanModules",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PerformanceRoutings_StudyPlanModules_ToModuleId",
                        column: x => x.ToModuleId,
                        principalTable: "StudyPlanModules",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "StudyPlanModuleProgresses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ModuleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ProgressPercentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Score = table.Column<int>(type: "int", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudyPlanModuleProgresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudyPlanModuleProgresses_StudyPlanModules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "StudyPlanModules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StudyPlanModuleProgresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PerformanceRoutings_FromModuleId",
                table: "PerformanceRoutings",
                column: "FromModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_PerformanceRoutings_ToModuleId",
                table: "PerformanceRoutings",
                column: "ToModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanModuleProgresses_ModuleId",
                table: "StudyPlanModuleProgresses",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanModuleProgresses_UserId",
                table: "StudyPlanModuleProgresses",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlanModules_QuestionBankId",
                table: "StudyPlanModules",
                column: "QuestionBankId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PerformanceRoutings");

            migrationBuilder.DropTable(
                name: "StudyPlanModuleProgresses");

            migrationBuilder.DropTable(
                name: "StudyPlanModules");
        }
    }
}
