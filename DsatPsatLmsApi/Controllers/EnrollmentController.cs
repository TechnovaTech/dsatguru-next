using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EnrollmentController : ControllerBase
{
    private readonly AppDbContext _context;

    public EnrollmentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEnrolledCourses()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            var enrollments = await _context.CourseEnrollments
                .Include(e => e.Course)
                .Where(e => e.UserId == userId)
                .Select(e => new
                {
                    courseId = e.CourseId,
                    courseName = e.Course.Title,
                    enrolledAt = e.EnrolledAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = enrollments });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving enrollments: {ex.Message}" });
        }
    }

    [HttpGet("check/{courseId}")]
    public async Task<IActionResult> CheckEnrollment(Guid courseId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            var enrollment = await _context.CourseEnrollments
                .FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);

            return Ok(new { 
                success = true, 
                isEnrolled = enrollment != null,
                enrollmentDate = enrollment?.EnrolledAt
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error checking enrollment: {ex.Message}" });
        }
    }
}