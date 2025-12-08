using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/test-sessions")]
[Authorize(Roles = "Admin")]
public class TestSessionController : ControllerBase
{
    private readonly AppDbContext _context;

    public TestSessionController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSessions(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? userName = null,
        [FromQuery] string? moduleRoute = null)
    {
        try
        {
            // Start with all sessions
            var query = _context.TestSessions
                .Include(s => s.User)
                .AsQueryable();

            // Apply filters
            if (startDate.HasValue)
                query = query.Where(s => s.StartTime >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(s => s.StartTime <= endDate.Value);

            if (!string.IsNullOrEmpty(userId))
                query = query.Where(s => s.UserId.ToString() == userId);

            if (!string.IsNullOrEmpty(userName))
                query = query.Where(s => s.User.Name.Contains(userName));

            if (!string.IsNullOrEmpty(moduleRoute))
                query = query.Where(s => s.ModuleRoute == moduleRoute);

            // Get the sessions
            var sessions = await query
                .OrderByDescending(s => s.StartTime)
                .Select(s => new
                {
                    s.Id,
                    UserId = s.UserId.ToString(),
                    UserName = s.User.Name,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Status = s.EndTime.HasValue ? "Completed" : "Active",
                    s.ModuleRoute,
                    PercentCorrect = s.TotalQuestions > 0 
                        ? Math.Round((double)s.CorrectAnswers / s.TotalQuestions * 100, 1) 
                        : 0,
                    s.Score
                })
                .ToListAsync();

            return Ok(new { success = true, data = sessions });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving test sessions: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSessionDetails(Guid id)
    {
        try
        {
            var session = await _context.TestSessions
                .Include(s => s.User)
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (session == null)
                return NotFound(new { success = false, message = "Test session not found" });

            // Calculate IRT values
            var irtCalculation = CalculateIRT(session);

            var sessionDetails = new
            {
                Id = session.Id,
                UserId = session.UserId.ToString(),
                UserName = session.User.Name,
                Email = session.User.Email,
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                Status = session.EndTime.HasValue ? "Completed" : "Active",
                ModuleRoute = session.ModuleRoute,
                TotalQuestions = session.TotalQuestions,
                CorrectAnswers = session.CorrectAnswers,
                PercentCorrect = session.TotalQuestions > 0 
                    ? Math.Round((double)session.CorrectAnswers / session.TotalQuestions * 100, 1) 
                    : 0,
                Score = session.Score,
                IrtCalculation = irtCalculation,
                Questions = session.Questions.Select(q => new
                {
                    q.Id,
                    q.Content,
                    q.Subject,
                    Difficulty = q.Difficulty.ToString(),
                    q.CorrectAnswer,
                    q.UserAnswer,
                    IsCorrect = q.CorrectAnswer == q.UserAnswer,
                    q.TimeSpent
                }).ToList()
            };

            return Ok(new { success = true, data = sessionDetails });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving test session details: {ex.Message}" });
        }
    }

    private object CalculateIRT(Models.TestSession session)
    {
        // This would be a complex calculation in a real implementation
        // For now, we'll return mock data
        return new
        {
            MathAbility = 0.75,
            RwAbility = 0.82,
            MathStandardError = 0.123,
            RwStandardError = 0.118,
            CalculationMethod = "3PL IRT Model",
            CalculationTime = DateTime.UtcNow
        };
    }
}