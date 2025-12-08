using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuestionBankEnrollmentController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuestionBankEnrollmentController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("enrolled")]
    public async Task<IActionResult> GetEnrolledQuestionBanks()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            var enrollments = await _context.QuestionBankEnrollments
                .Include(e => e.QuestionBank)
                .Where(e => e.UserId == userId)
                .Select(e => new
                {
                    id = e.QuestionBankId,
                    name = e.QuestionBank.Title,
                    title = e.QuestionBank.Title,
                    description = e.QuestionBank.Description,
                    enrolledAt = e.EnrolledAt,
                    totalQuestions = _context.Questions.Count(q => q.QuestionBankId == e.QuestionBankId && q.IsActive)
                })
                .ToListAsync();

            return Ok(new { success = true, data = enrollments });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving question bank enrollments: {ex.Message}" });
        }
    }

    [HttpPost("{questionBankId}")]
    public async Task<IActionResult> EnrollInQuestionBank(Guid questionBankId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            // Check if question bank exists and is of type "question_bank"
            var questionBank = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == questionBankId && c.Type == "question_bank");
            
            if (questionBank == null)
            {
                return NotFound(new { message = "Question bank not found" });
            }

            // Check if already enrolled
            var existingEnrollment = await _context.QuestionBankEnrollments
                .FirstOrDefaultAsync(e => e.UserId == userId && e.QuestionBankId == questionBankId);
            
            if (existingEnrollment != null)
            {
                return BadRequest(new { message = "Already enrolled in this question bank" });
            }

            // Create new enrollment
            var enrollment = new DsatPsatLmsApi.Models.QuestionBankEnrollment
            {
                UserId = userId,
                QuestionBankId = questionBankId,
                EnrolledAt = DateTime.UtcNow
            };

            _context.QuestionBankEnrollments.Add(enrollment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Successfully enrolled in question bank" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error enrolling in question bank: {ex.Message}" });
        }
    }

    [HttpDelete("{questionBankId}")]
    public async Task<IActionResult> UnenrollFromQuestionBank(Guid questionBankId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            var enrollment = await _context.QuestionBankEnrollments
                .FirstOrDefaultAsync(e => e.UserId == userId && e.QuestionBankId == questionBankId);
            
            if (enrollment == null)
            {
                return NotFound(new { message = "Enrollment not found" });
            }

            _context.QuestionBankEnrollments.Remove(enrollment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Successfully unenrolled from question bank" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error unenrolling from question bank: {ex.Message}" });
        }
    }

    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableQuestionBanks()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            // Get enrolled question bank IDs
            var enrolledIds = await _context.QuestionBankEnrollments
                .Where(e => e.UserId == userId)
                .Select(e => e.QuestionBankId)
                .ToListAsync();

            // Get available question banks (not enrolled)
            var availableQuestionBanks = await _context.Courses
                .Where(c => c.Type == "question_bank" && !enrolledIds.Contains(c.Id))
                .Select(c => new
                {
                    id = c.Id,
                    name = c.Title,
                    title = c.Title,
                    description = c.Description,
                    totalQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id && q.IsActive)
                })
                .ToListAsync();

            return Ok(new { success = true, data = availableQuestionBanks });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving available question banks: {ex.Message}" });
        }
    }
}