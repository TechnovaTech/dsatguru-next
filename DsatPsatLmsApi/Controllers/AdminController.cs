using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var totalStudents = await _context.Users.CountAsync(u => u.Role == UserRole.Student);
        var totalTutors = await _context.Users.CountAsync(u => u.Role == UserRole.Tutor);
        var totalRevenue = await _context.Payments
            .Where(p => p.Status == PaymentStatus.Succeeded)
            .SumAsync(p => p.Amount);
        var upcomingClasses = await _context.LiveClasses
            .Where(c => c.StartTime > DateTime.UtcNow && c.StartTime < DateTime.UtcNow.AddDays(7))
            .CountAsync();
        var totalQuestions = await _context.Questions.CountAsync(q => q.IsActive);

        var recentEnrollments = await _context.CourseEnrollments
            .Include(e => e.User)
            .Include(e => e.Course)
            .OrderByDescending(e => e.EnrolledAt)
            .Take(5)
            .Select(e => new
            {
                StudentName = e.User.Name,
                CourseName = e.Course.Title,
                EnrolledAt = e.EnrolledAt
            })
            .ToListAsync();

        var next24hClasses = await _context.LiveClasses
            .Include(c => c.Instructor)
            .Where(c => c.StartTime > DateTime.UtcNow && c.StartTime < DateTime.UtcNow.AddDays(1))
            .OrderBy(c => c.StartTime)
            .Select(c => new
            {
                c.Title,
                c.StartTime,
                InstructorName = c.Instructor.Name
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalStudents,
                totalTutors,
                totalRevenue,
                upcomingClasses,
                totalQuestions,
                recentEnrollments,
                next24hClasses
            }
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role = null)
    {
        var query = _context.Users.AsQueryable();
        
        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var userRole))
        {
            query = query.Where(u => u.Role == userRole);
        }

        var users = await query
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToString(),
                u.CreatedAt,
                u.IsActive
            })
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return Ok(new { success = true, data = users });
    }

    [HttpPut("users/{id}/toggle")]
    public async Task<IActionResult> ToggleUserStatus(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "User not found" });

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully" });
    }
}