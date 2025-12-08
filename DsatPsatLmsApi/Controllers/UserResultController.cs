using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/user-results")]
[Authorize(Roles = "Admin")]
public class UserResultController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserResultController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserResults([FromQuery] string search)
    {
        try
        {
            if (string.IsNullOrEmpty(search))
                return BadRequest(new { success = false, message = "Search parameter is required" });

            // Find user by ID, email, or name
            var user = await _context.Users
                .FirstOrDefaultAsync(u => 
                    u.Id.ToString() == search || 
                    u.Email.Contains(search) || 
                    u.Name.Contains(search));

            if (user == null)
                return NotFound(new { success = false, message = "User not found" });

            // Get base module results
            var baseModule = await _context.TestResults
                .Where(r => r.UserId == user.Id && r.ModuleType == "Base")
                .OrderByDescending(r => r.CompletionDate)
                .FirstOrDefaultAsync();

            // Get adaptive module results
            var adaptiveModule = await _context.TestResults
                .Where(r => r.UserId == user.Id && r.ModuleType == "Adaptive")
                .OrderByDescending(r => r.CompletionDate)
                .FirstOrDefaultAsync();

            // Get route determination
            var routeDetermination = await _context.RouteDeterminations
                .Where(r => r.UserId == user.Id)
                .OrderByDescending(r => r.DeterminationDate)
                .FirstOrDefaultAsync();

            // Get final score calculation
            var finalScore = await _context.FinalScores
                .Where(s => s.UserId == user.Id)
                .OrderByDescending(s => s.CalculationDate)
                .FirstOrDefaultAsync();

            // Get IRT calculation
            var irtCalculation = await _context.IrtCalculations
                .Where(i => i.UserId == user.Id)
                .OrderByDescending(i => i.CalculationDate)
                .FirstOrDefaultAsync();

            // Check for critical warnings
            var criticalWarnings = new List<string>();
            
            // Example warning check: base cap hit
            if (baseModule != null && baseModule.QuestionsAttempted >= 100 && baseModule.CorrectAnswers < 40)
            {
                criticalWarnings.Add("Base module cap hit with low performance (less than 40% correct)");
            }
            
            // Example warning check: route mismatch
            if (routeDetermination != null && adaptiveModule != null)
            {
                if (routeDetermination.DifficultyModule == "High" && adaptiveModule.CorrectAnswers < 10)
                {
                    criticalWarnings.Add("Student may be misrouted - high difficulty with very low performance");
                }
            }

            // Construct the response
            var userResults = new
            {
                UserId = user.Id.ToString(),
                user.Name,
                user.Email,
                RegistrationDate = user.CreatedAt,
                BaseModule = baseModule != null ? new
                {
                    MathScore = baseModule.MathScore,
                    RwScore = baseModule.ReadingWritingScore,
                    TotalScore = baseModule.TotalScore,
                    CompletionDate = baseModule.CompletionDate,
                    QuestionsAttempted = baseModule.QuestionsAttempted,
                    CorrectAnswers = baseModule.CorrectAnswers
                } : null,
                RouteTaken = routeDetermination != null ? new
                {
                    DifficultyModule = routeDetermination.DifficultyModule,
                    DeterminationDate = routeDetermination.DeterminationDate
                } : null,
                AdaptiveModule = adaptiveModule != null ? new
                {
                    MathScore = adaptiveModule.MathScore,
                    RwScore = adaptiveModule.ReadingWritingScore,
                    TotalScore = adaptiveModule.TotalScore,
                    CompletionDate = adaptiveModule.CompletionDate,
                    QuestionsAttempted = adaptiveModule.QuestionsAttempted,
                    CorrectAnswers = adaptiveModule.CorrectAnswers
                } : null,
                FinalScore = finalScore != null ? new
                {
                    MathScore = finalScore.MathScore,
                    RwScore = finalScore.ReadingWritingScore,
                    TotalScore = finalScore.TotalScore,
                    CalculationDate = finalScore.CalculationDate
                } : null,
                IrtCalculation = irtCalculation != null ? new
                {
                    MathAbility = irtCalculation.MathAbility,
                    RwAbility = irtCalculation.ReadingWritingAbility,
                    MathStandardError = irtCalculation.MathStandardError,
                    RwStandardError = irtCalculation.ReadingWritingStandardError
                } : null,
                CriticalWarnings = criticalWarnings
            };

            return Ok(new { success = true, data = userResults });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving user results: {ex.Message}" });
        }
    }
}