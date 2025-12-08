using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEnhancedLiveClassManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClassTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultDurationMinutes = table.Column<int>(type: "int", nullable: false),
                    MaxCapacity = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EnhancedLiveClasses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClassTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    InstructorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MaxStudents = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ZoomMeetingId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZoomJoinUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ZoomPassword = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GoogleMeetUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordingUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsRecurring = table.Column<bool>(type: "bit", nullable: false),
                    RecurrenceRule = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ParentClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Resources = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EnhancedLiveClasses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EnhancedLiveClasses_ClassTypes_ClassTypeId",
                        column: x => x.ClassTypeId,
                        principalTable: "ClassTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EnhancedLiveClasses_EnhancedLiveClasses_ParentClassId",
                        column: x => x.ParentClassId,
                        principalTable: "EnhancedLiveClasses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EnhancedLiveClasses_Users_InstructorId",
                        column: x => x.InstructorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClassAttendances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LeftAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TotalMinutesAttended = table.Column<int>(type: "int", nullable: false),
                    IsPresent = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassAttendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassAttendances_EnhancedLiveClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "EnhancedLiveClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassAttendances_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClassEnrollments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    EnrolledAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WaitlistPosition = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassEnrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassEnrollments_EnhancedLiveClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "EnhancedLiveClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassEnrollments_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClassFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ContentRating = table.Column<int>(type: "int", nullable: false),
                    InstructorRating = table.Column<int>(type: "int", nullable: false),
                    TechnicalRating = table.Column<int>(type: "int", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassFeedbacks_EnhancedLiveClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "EnhancedLiveClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassFeedbacks_Users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClassMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClassId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    IsQuestion = table.Column<bool>(type: "bit", nullable: false),
                    IsAnswered = table.Column<bool>(type: "bit", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassMessages_EnhancedLiveClasses_ClassId",
                        column: x => x.ClassId,
                        principalTable: "EnhancedLiveClasses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClassMessages_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassAttendances_ClassId",
                table: "ClassAttendances",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassAttendances_StudentId",
                table: "ClassAttendances",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassEnrollments_ClassId",
                table: "ClassEnrollments",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassEnrollments_StudentId",
                table: "ClassEnrollments",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassFeedbacks_ClassId",
                table: "ClassFeedbacks",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassFeedbacks_StudentId",
                table: "ClassFeedbacks",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassMessages_ClassId",
                table: "ClassMessages",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassMessages_SenderId",
                table: "ClassMessages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_EnhancedLiveClasses_ClassTypeId",
                table: "EnhancedLiveClasses",
                column: "ClassTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_EnhancedLiveClasses_InstructorId",
                table: "EnhancedLiveClasses",
                column: "InstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_EnhancedLiveClasses_ParentClassId",
                table: "EnhancedLiveClasses",
                column: "ParentClassId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassAttendances");

            migrationBuilder.DropTable(
                name: "ClassEnrollments");

            migrationBuilder.DropTable(
                name: "ClassFeedbacks");

            migrationBuilder.DropTable(
                name: "ClassMessages");

            migrationBuilder.DropTable(
                name: "EnhancedLiveClasses");

            migrationBuilder.DropTable(
                name: "ClassTypes");
        }
    }
}
