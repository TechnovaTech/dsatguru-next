using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class FeedbackController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(AppDbContext context, ILogger<FeedbackController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // POST /api/admin/feedback
    [HttpPost]
    public async Task<IActionResult> AddFeedback([FromBody] AddFeedbackRequest request)
    {
        try
        {
            var adminUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            
            var userResponse = await _context.UserResponses
                .FirstOrDefaultAsync(r => r.Id == request.UserResponseId);
                
            if (userResponse == null)
            {
                return NotFound("User response not found");
            }

            userResponse.AdminFeedback = request.Feedback;
            userResponse.ReviewedBy = adminUserId;
            userResponse.ReviewedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Feedback added successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding feedback");
            return StatusCode(500, "Internal server error");
        }
    }

    // GET /api/admin/feedback/test-attempts
    [HttpGet("test-attempts")]
    public async Task<IActionResult> GetTestAttempts(
        [FromQuery] Guid? userId = null,
        [FromQuery] string? subject = null,
        [FromQuery] string? moduleType = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var query = _context.TestSessions
                .Include(ts => ts.User)
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(ts => ts.UserId == userId.Value);

            // Note: Subject filtering removed as TestSession doesn't have Subject property
            // if (!string.IsNullOrEmpty(subject))
            //     query = query.Where(ts => ts.Subject == subject);

            if (!string.IsNullOrEmpty(moduleType))
                query = query.Where(ts => ts.ModuleRoute == moduleType);

            if (startDate.HasValue)
                query = query.Where(ts => ts.StartTime >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(ts => ts.EndTime <= endDate.Value);

            var totalCount = await query.CountAsync();
            
            var testAttempts = await query
                .OrderByDescending(ts => ts.StartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ts => new
                {
                    ts.Id,
                    User = new { ts.User.Id, ts.User.Name, ts.User.Email },
                    ts.StartTime,
                    ts.EndTime,
                    ts.ModuleRoute,
                    Score = ts.Score,
                    CorrectAnswers = ts.CorrectAnswers,
                    TotalQuestions = ts.TotalQuestions,
                    CompletionPercentage = ts.TotalQuestions > 0 ? 
                        Math.Round((double)ts.CorrectAnswers / ts.TotalQuestions * 100, 1) : 0,
                    TimeTaken = ts.EndTime.HasValue ? (double?)(ts.EndTime.Value - ts.StartTime).TotalMinutes : null
                })
                .ToListAsync();

            return Ok(new
            {
                testAttempts,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test attempts");
            return StatusCode(500, "Internal server error");
        }
    }

    // GET /api/admin/feedback/test-attempts/{testSessionId}/responses
    [HttpGet("test-attempts/{testSessionId}/responses")]
    public async Task<IActionResult> GetTestAttemptResponses(Guid testSessionId)
    {
        try
        {
            var testSession = await _context.TestSessions
                .Include(ts => ts.User)
                .FirstOrDefaultAsync(ts => ts.Id == testSessionId);

            if (testSession == null)
            {
                return NotFound("Test session not found");
            }

            var userResponses = await _context.UserResponses
                .Include(r => r.Question)
                .Include(r => r.Reviewer)
                .Where(r => r.TestSessionId == testSessionId)
                .OrderBy(r => r.Timestamp)
                .Select(r => new
                {
                    r.Id,
                    Question = new
                    {
                        r.Question.Id,
                        r.Question.Title,
                        r.Question.Content,
                        r.Question.Options,
                        r.Question.CorrectAnswer,
                        r.Question.Explanation,
                        r.Question.Subject,
                        r.Question.Difficulty,
                        r.Question.Type
                    },
                    r.SelectedOption,
                    r.IsCorrect,
                    r.TimeSpent,
                    r.Timestamp,
                    r.AdminFeedback,
                    Reviewer = r.Reviewer != null ? new
                    {
                        r.Reviewer.Name
                    } : null,
                    r.ReviewedAt
                })
                .ToListAsync();

            return Ok(new
            {
                testSession = new
                {
                    testSession.Id,
                    User = new
                    {
                        testSession.User.Name,
                        testSession.User.Email
                    },
                    testSession.StartTime,
                    testSession.EndTime,
                    testSession.ModuleRoute,
                    testSession.Score,
                    testSession.CorrectAnswers,
                    testSession.TotalQuestions,
                    CompletionPercentage = testSession.TotalQuestions > 0 ? 
                        Math.Round((double)testSession.CorrectAnswers / testSession.TotalQuestions * 100, 1) : 0
                },
                userResponses
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test attempt responses");
            return StatusCode(500, "Internal server error");
        }
    }

    // GET /api/admin/feedback/users/{userId}/attempts
    [HttpGet("users/{userId}/attempts")]
    public async Task<IActionResult> GetUserTestAttempts(Guid userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found");
            }

            var testAttempts = await _context.TestSessions
                .Where(ts => ts.UserId == userId)
                .OrderByDescending(ts => ts.StartTime)
                .Select(ts => new
                {
                    ts.Id,
                    ts.StartTime,
                    ts.EndTime,
                    ts.ModuleRoute,
                    Score = ts.Score,
                    CorrectAnswers = ts.CorrectAnswers,
                    TotalQuestions = ts.TotalQuestions,
                    CompletionPercentage = ts.TotalQuestions > 0 ? 
                        Math.Round((double)ts.CorrectAnswers / ts.TotalQuestions * 100, 1) : 0,
                    TimeTaken = ts.EndTime.HasValue ? (double?)(ts.EndTime.Value - ts.StartTime).TotalMinutes : null
                })
                .ToListAsync();

            return Ok(new
            {
                user = new { user.Id, user.Name, user.Email },
                testAttempts
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user test attempts");
            return StatusCode(500, "Internal server error");
        }
    }
}

public class AddFeedbackRequest
{
    public Guid UserResponseId { get; set; }
    public string Feedback { get; set; } = string.Empty;
}