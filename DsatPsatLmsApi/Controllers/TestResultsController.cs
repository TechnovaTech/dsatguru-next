using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/test-results")]
[Authorize]
public class TestResultsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<TestResultsController> _logger;

    public TestResultsController(AppDbContext context, ILogger<TestResultsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetTestResults(Guid sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var session = await _context.TestSessions
                .Include(s => s.Questions)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Test results not found" });

            // Get IRT calculation
            var irtCalculation = await _context.IrtCalculations
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.CalculationDate)
                .FirstOrDefaultAsync();

            // Calculate section breakdown
            var sectionBreakdown = CalculateSectionBreakdown(session.Questions);

            // Determine performance level
            var performanceLevel = GetPerformanceLevel(session.Score);

            // Get adaptive routing recommendation
            var adaptiveRouting = DetermineAdaptiveRouting(session.Score, session.ModuleRoute);

            var result = new
            {
                sessionId = session.Id,
                moduleType = session.ModuleRoute,
                completedAt = session.EndTime,
                timeSpent = session.EndTime.HasValue 
                    ? (int)(session.EndTime.Value - session.StartTime).TotalSeconds 
                    : 0,
                
                // Score Overview
                scoreOverview = new
                {
                    rawScore = session.CorrectAnswers,
                    totalQuestions = session.TotalQuestions,
                    percentageScore = session.Score,
                    scaledScoreMath = irtCalculation != null ? Math.Round(200 + (irtCalculation.MathAbility * 100), 0) : 400,
                    scaledScoreRW = irtCalculation != null ? Math.Round(200 + (irtCalculation.ReadingWritingAbility * 100), 0) : 400,
                    totalScaled = irtCalculation != null ? Math.Round(400 + ((irtCalculation.MathAbility + irtCalculation.ReadingWritingAbility) * 100), 0) : 800,
                    percentileRank = CalculatePercentileRank(session.Score)
                },

                // Test Statistics
                testStatistics = new
                {
                    questionsAnswered = session.Questions.Count(q => !string.IsNullOrEmpty(q.UserAnswer)),
                    questionsCorrect = session.CorrectAnswers,
                    accuracy = session.TotalQuestions > 0 ? Math.Round((double)session.CorrectAnswers / session.TotalQuestions * 100, 1) : 0,
                    averageTimePerQuestion = session.Questions.Count > 0 ? Math.Round(session.Questions.Average(q => q.TimeSpent), 1) : 0,
                    totalTimeSpent = session.Questions.Sum(q => q.TimeSpent)
                },

                // IRT Analysis
                irtAnalysis = irtCalculation != null ? new
                {
                    mathAbility = Math.Round(irtCalculation.MathAbility, 3),
                    readingWritingAbility = Math.Round(irtCalculation.ReadingWritingAbility, 3),
                    mathStandardError = Math.Round(irtCalculation.MathStandardError, 3),
                    readingWritingStandardError = Math.Round(irtCalculation.ReadingWritingStandardError, 3),
                    reliability = 0.85,
                    calculationMethod = "IRT 3PL Model",
                    calculatedAt = irtCalculation.CalculationDate
                } : null,

                // Section Breakdown
                sectionBreakdown = sectionBreakdown,

                // Performance Analysis
                performanceAnalysis = new
                {
                    level = performanceLevel.Level,
                    description = performanceLevel.Description,
                    strengths = GetStrengths(sectionBreakdown),
                    areasForImprovement = GetAreasForImprovement(sectionBreakdown),
                    recommendations = GetRecommendations(session.Score, sectionBreakdown)
                },

                // Adaptive Routing
                adaptiveRouting = new
                {
                    shouldRoute = adaptiveRouting.ShouldRoute,
                    recommendedModule = adaptiveRouting.AdaptiveModule,
                    reasoning = adaptiveRouting.Recommendation,
                    nextSteps = GetNextSteps(adaptiveRouting.AdaptiveModule)
                }
            };

            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test results for session {SessionId}", sessionId);
            return StatusCode(500, new { success = false, message = "Error retrieving test results" });
        }
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestTestResults()
    {
        try
        {
            var userId = GetCurrentUserId();
            var latestSession = await _context.TestSessions
                .Include(s => s.Questions)
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .FirstOrDefaultAsync();

            if (latestSession == null)
                return NotFound(new { success = false, message = "No completed test sessions found" });

            // Redirect to the specific session results
            return await GetTestResults(latestSession.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest test results for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { success = false, message = "Error retrieving latest test results" });
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetTestResultsHistory([FromQuery] int limit = 10)
    {
        try
        {
            var userId = GetCurrentUserId();
            var sessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .Take(limit)
                .Select(s => new
                {
                    sessionId = s.Id,
                    moduleType = s.ModuleRoute,
                    completedAt = s.EndTime,
                    score = s.Score,
                    correctAnswers = s.CorrectAnswers,
                    totalQuestions = s.TotalQuestions,
                    timeSpent = s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalSeconds : 0,
                    performanceLevel = GetPerformanceLevel(s.Score).Level
                })
                .ToListAsync();

            return Ok(new { success = true, data = sessions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test results history for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { success = false, message = "Error retrieving test results history" });
        }
    }

    private List<object> CalculateSectionBreakdown(ICollection<SessionQuestion> questions)
    {
        var breakdown = questions
            .GroupBy(q => q.Subject)
            .Select(g => new
            {
                subject = g.Key,
                totalQuestions = g.Count(),
                correctAnswers = g.Count(q => q.CorrectAnswer == q.UserAnswer),
                percentage = g.Count() > 0 ? Math.Round((double)g.Count(q => q.CorrectAnswer == q.UserAnswer) / g.Count() * 100, 1) : 0,
                averageTime = g.Count() > 0 ? Math.Round(g.Average(q => q.TimeSpent), 1) : 0,
                difficulty = g.GroupBy(q => q.Difficulty)
                    .Select(d => new
                    {
                        level = d.Key.ToString(),
                        correct = d.Count(q => q.CorrectAnswer == q.UserAnswer),
                        total = d.Count()
                    }).ToList()
            })
            .Cast<object>()
            .ToList();

        return breakdown;
    }

    private (string Level, string Description) GetPerformanceLevel(int score)
    {
        return score switch
        {
            >= 90 => ("Excellent", "Outstanding performance with strong mastery of concepts"),
            >= 80 => ("Good", "Good performance with solid understanding"),
            >= 70 => ("Fair", "Fair performance with room for improvement"),
            >= 60 => ("Needs Improvement", "Below average performance requiring focused study"),
            _ => ("Needs Significant Improvement", "Significant gaps in understanding requiring comprehensive review")
        };
    }

    private int CalculatePercentileRank(int score)
    {
        // Simplified percentile calculation - in production, this would be based on actual score distributions
        return score switch
        {
            >= 95 => 99,
            >= 90 => 95,
            >= 85 => 90,
            >= 80 => 85,
            >= 75 => 75,
            >= 70 => 65,
            >= 65 => 55,
            >= 60 => 45,
            >= 55 => 35,
            >= 50 => 25,
            _ => 15
        };
    }

    private List<string> GetStrengths(List<object> sectionBreakdown)
    {
        var strengths = new List<string>();
        
        // This would analyze the section breakdown to identify strengths
        // For now, returning generic strengths
        strengths.Add("Problem-solving approach");
        strengths.Add("Time management");
        
        return strengths;
    }

    private List<string> GetAreasForImprovement(List<object> sectionBreakdown)
    {
        var areas = new List<string>();
        
        // This would analyze the section breakdown to identify weak areas
        // For now, returning generic areas
        areas.Add("Complex problem solving");
        areas.Add("Reading comprehension");
        
        return areas;
    }

    private List<string> GetRecommendations(int score, List<object> sectionBreakdown)
    {
        var recommendations = new List<string>();
        
        if (score < 70)
        {
            recommendations.Add("Focus on fundamental concepts");
            recommendations.Add("Practice with easier problems first");
            recommendations.Add("Review basic mathematical operations");
        }
        else if (score < 85)
        {
            recommendations.Add("Work on advanced problem-solving techniques");
            recommendations.Add("Practice timed tests to improve speed");
            recommendations.Add("Focus on weak subject areas");
        }
        else
        {
            recommendations.Add("Continue practicing challenging problems");
            recommendations.Add("Focus on test-taking strategies");
            recommendations.Add("Review any remaining weak areas");
        }
        
        return recommendations;
    }

    private (bool ShouldRoute, string AdaptiveModule, string Recommendation) DetermineAdaptiveRouting(int score, string moduleType)
    {
        if (moduleType != "base")
            return (false, "", "Test sequence completed");

        return score switch
        {
            >= 80 => (true, "adaptive-hard", "High performance - proceed to advanced adaptive module"),
            >= 60 => (true, "adaptive-medium", "Good performance - proceed to intermediate adaptive module"),
            _ => (true, "adaptive-easy", "Needs improvement - proceed to foundational adaptive module")
        };
    }

    private List<string> GetNextSteps(string adaptiveModule)
    {
        return adaptiveModule switch
        {
            "adaptive-hard" => new List<string>
            {
                "Take the advanced adaptive module",
                "Focus on challenging problem types",
                "Practice advanced test strategies"
            },
            "adaptive-medium" => new List<string>
            {
                "Take the intermediate adaptive module",
                "Review moderate difficulty concepts",
                "Build confidence with practice tests"
            },
            "adaptive-easy" => new List<string>
            {
                "Take the foundational adaptive module",
                "Review basic concepts thoroughly",
                "Practice fundamental skills"
            },
            _ => new List<string>
            {
                "Review your performance",
                "Continue practicing",
                "Consult with instructors if needed"
            }
        };
    }
}