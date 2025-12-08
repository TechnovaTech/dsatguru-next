using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AnalyticsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalRevenue = await _context.Payments
            .Where(p => p.Status == PaymentStatus.Succeeded)
            .SumAsync(p => p.Amount);

        var monthlyRevenue = await _context.Payments
            .Where(p => p.Status == PaymentStatus.Succeeded && p.CreatedAt >= DateTime.UtcNow.AddMonths(-1))
            .SumAsync(p => p.Amount);

        var totalEnrollments = await _context.CourseEnrollments.CountAsync();
        var monthlyEnrollments = await _context.CourseEnrollments
            .Where(e => e.EnrolledAt >= DateTime.UtcNow.AddMonths(-1))
            .CountAsync();

        var activeStudents = await _context.Users
            .Where(u => u.Role == UserRole.Student && u.IsActive)
            .CountAsync();

        var activeTutors = await _context.Users
            .Where(u => u.Role == UserRole.Tutor && u.IsActive)
            .CountAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalRevenue,
                monthlyRevenue,
                totalEnrollments,
                monthlyEnrollments,
                activeStudents,
                activeTutors
            }
        });
    }

    [HttpGet("revenue")]
    public async Task<IActionResult> GetRevenueStats([FromQuery] int months = 12)
    {
        var startDate = DateTime.UtcNow.AddMonths(-months);
        
        var revenueData = await _context.Payments
            .Where(p => p.Status == PaymentStatus.Succeeded && p.CreatedAt >= startDate)
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Revenue = g.Sum(p => p.Amount),
                Count = g.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync();

        return Ok(new { success = true, data = revenueData });
    }

    [HttpGet("students")]
    public async Task<IActionResult> GetStudentProgress()
    {
        var progress = await _context.StudentProgresses
            .Include(p => p.Student)
            .Include(p => p.Course)
            .Select(p => new
            {
                StudentName = p.Student.Name,
                CourseName = p.Course.Title,
                p.ProgressPercentage,
                p.AverageScore,
                p.LastActivity
            })
            .OrderByDescending(p => p.LastActivity)
            .Take(50)
            .ToListAsync();

        return Ok(new { success = true, data = progress });
    }

    [HttpGet("tutors")]
    public async Task<IActionResult> GetTutorPerformance()
    {
        var performance = await _context.TutorPerformances
            .Include(p => p.Tutor)
            .Select(p => new
            {
                TutorName = p.Tutor.Name,
                p.TotalClasses,
                p.StudentsEnrolled,
                p.AverageRating,
                p.Revenue
            })
            .OrderByDescending(p => p.Revenue)
            .ToListAsync();

        return Ok(new { success = true, data = performance });
    }
}