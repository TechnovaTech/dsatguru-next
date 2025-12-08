using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DsatPsatLmsApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateQuestionModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Topic",
                table: "Questions",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "Subtopic",
                table: "Questions",
                newName: "Tags");

            migrationBuilder.AlterColumn<string>(
                name: "CorrectAnswer",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Subject",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "TestType",
                table: "Questions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Subject",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TestType",
                table: "Questions");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Questions",
                newName: "Topic");

            migrationBuilder.RenameColumn(
                name: "Tags",
                table: "Questions",
                newName: "Subtopic");

            migrationBuilder.AlterColumn<string>(
                name: "CorrectAnswer",
                table: "Questions",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
