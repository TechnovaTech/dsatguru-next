using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/test-session")]
[Authorize]
public class StudentTestSessionController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<StudentTestSessionController> _logger;

    public StudentTestSessionController(AppDbContext context, ILogger<StudentTestSessionController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartTestSession([FromBody] StartTestSessionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(new { success = false, message = "Invalid user" });

            // Create new test session
            var testSession = new TestSession
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ModuleRoute = request.ModuleType,
                StartTime = DateTime.UtcNow,
                TotalQuestions = 0,
                CorrectAnswers = 0,
                Score = 0
            };

            _context.TestSessions.Add(testSession);

            // Get questions based on module type and question bank
            var questions = await GetQuestionsForModule(request.ModuleType, request.QuestionBankId);
            
            // Add questions to session
            foreach (var question in questions)
            {
                var sessionQuestion = new SessionQuestion
                {
                    Id = Guid.NewGuid(),
                    TestSessionId = testSession.Id,
                    Content = question.Content,
                    Subject = question.Subject,
                    Difficulty = question.Difficulty,
                    CorrectAnswer = question.CorrectAnswer,
                    UserAnswer = "",
                    TimeSpent = 0
                };
                _context.SessionQuestions.Add(sessionQuestion);
            }

            testSession.TotalQuestions = questions.Count;
            await _context.SaveChangesAsync();

            // Return session data
            var response = new
            {
                sessionId = testSession.Id,
                questions = questions.Select(q => new
                {
                    id = q.Id,
                    content = q.Content,
                    options = !string.IsNullOrEmpty(q.Options) ? 
                        System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.Options) : 
                        new List<object>(),
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString()
                }).ToList(),
                moduleInfo = new
                {
                    type = request.ModuleType,
                    timeLimit = GetTimeLimitForModule(request.ModuleType),
                    totalQuestions = questions.Count
                },
                timeLimit = GetTimeLimitForModule(request.ModuleType)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting test session");
            return StatusCode(500, new { success = false, message = "Error starting test session" });
        }
    }

    [HttpPost("save-progress")]
    public async Task<IActionResult> SaveProgress([FromBody] SaveProgressRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var session = await _context.TestSessions
                .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.UserId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Session not found" });

            // Update session questions with answers
            var sessionQuestions = await _context.SessionQuestions
                .Where(sq => sq.TestSessionId == request.SessionId)
                .ToListAsync();

            foreach (var answer in request.Answers)
            {
                var sessionQuestion = sessionQuestions.FirstOrDefault(sq => sq.Id.ToString() == answer.Key);
                if (sessionQuestion != null)
                {
                    sessionQuestion.UserAnswer = answer.Value.SelectedAnswer ?? "";
                    sessionQuestion.TimeSpent = answer.Value.TimeSpent;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Progress saved" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving progress");
            return StatusCode(500, new { success = false, message = "Error saving progress" });
        }
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitTestSession([FromBody] SubmitTestRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var session = await _context.TestSessions
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.UserId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Session not found" });

            // Update final answers
            foreach (var answer in request.Answers)
            {
                var sessionQuestion = session.Questions.FirstOrDefault(sq => sq.Id.ToString() == answer.Key);
                if (sessionQuestion != null)
                {
                    sessionQuestion.UserAnswer = answer.Value.SelectedAnswer ?? "";
                    sessionQuestion.TimeSpent = answer.Value.TimeSpent;
                }
            }

            // Calculate score
            var correctAnswers = session.Questions.Count(q => q.CorrectAnswer == q.UserAnswer);
            session.CorrectAnswers = correctAnswers;
            session.Score = (int)Math.Round((double)correctAnswers / session.TotalQuestions * 100);
            session.EndTime = DateTime.UtcNow;

            // Calculate IRT and determine routing
            var irtResult = await CalculateIRTResults(session);
            var routingResult = DetermineAdaptiveRouting(session.Score, request.ModuleType);

            await _context.SaveChangesAsync();

            var response = new
            {
                success = true,
                sessionId = session.Id,
                score = session.Score,
                correctAnswers = session.CorrectAnswers,
                totalQuestions = session.TotalQuestions,
                irtResult = irtResult,
                routeToAdaptive = routingResult.ShouldRoute,
                adaptiveRoute = routingResult.AdaptiveModule,
                timeSpent = request.TimeSpent
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting test session");
            return StatusCode(500, new { success = false, message = "Error submitting test session" });
        }
    }

    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetTestSession(Guid sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var session = await _context.TestSessions
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Session not found" });

            var response = new
            {
                sessionId = session.Id,
                moduleType = session.ModuleRoute,
                startTime = session.StartTime,
                endTime = session.EndTime,
                totalQuestions = session.TotalQuestions,
                correctAnswers = session.CorrectAnswers,
                score = session.Score,
                questions = session.Questions.Select(q => new
                {
                    id = q.Id,
                    content = q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    userAnswer = q.UserAnswer,
                    correctAnswer = q.CorrectAnswer,
                    timeSpent = q.TimeSpent
                }).ToList()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test session");
            return StatusCode(500, new { success = false, message = "Error retrieving test session" });
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetTestHistory([FromQuery] int limit = 10)
    {
        try
        {
            var userId = GetCurrentUserId();
            var sessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.StartTime)
                .Take(limit)
                .Select(s => new
                {
                    sessionId = s.Id,
                    moduleType = s.ModuleRoute,
                    startTime = s.StartTime,
                    endTime = s.EndTime,
                    score = s.Score,
                    correctAnswers = s.CorrectAnswers,
                    totalQuestions = s.TotalQuestions,
                    percentCorrect = s.TotalQuestions > 0 ? Math.Round((double)s.CorrectAnswers / s.TotalQuestions * 100, 1) : 0
                })
                .ToListAsync();

            return Ok(new { success = true, data = sessions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test history");
            return StatusCode(500, new { success = false, message = "Error retrieving test history" });
        }
    }

    [HttpPost("adaptive-routing")]
    public async Task<IActionResult> GetAdaptiveRouting([FromBody] AdaptiveRoutingRequest request)
    {
        try
        {
            var routing = DetermineAdaptiveRouting(request.BaseModuleScore, "base");
            return Ok(new
            {
                success = true,
                shouldRoute = routing.ShouldRoute,
                adaptiveModule = routing.AdaptiveModule,
                recommendation = routing.Recommendation
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error determining adaptive routing");
            return StatusCode(500, new { success = false, message = "Error determining adaptive routing" });
        }
    }

    [HttpPost("calculate-irt")]
    public async Task<IActionResult> CalculateIRT([FromBody] CalculateIRTRequest request)
    {
        try
        {
            var session = await _context.TestSessions
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId);

            if (session == null)
                return NotFound(new { success = false, message = "Session not found" });

            var irtResult = await CalculateIRTResults(session);
            return Ok(new { success = true, data = irtResult });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating IRT results");
            return StatusCode(500, new { success = false, message = "Error calculating IRT results" });
        }
    }

    private async Task<List<Question>> GetQuestionsForModule(string moduleType, Guid? questionBankId = null)
    {
        var moduleTypeLower = moduleType.ToLower();
        
        var questionCount = moduleTypeLower switch
        {
            "base" => 20,
            "base-math" => 27,
            "base-reading-writing" => 27,
            "adaptive-easy" => 15,
            "adaptive-medium" => 15,
            "adaptive-hard" => 15,
            _ => 20
        };

        var difficulty = moduleTypeLower switch
        {
            "adaptive-easy" => DifficultyLevel.Easy,
            "adaptive-medium" => DifficultyLevel.Medium,
            "adaptive-hard" => DifficultyLevel.Hard,
            _ => (DifficultyLevel?)null
        };

        var query = _context.Questions.Where(q => q.IsActive && q.TestType == TestType.Base);
        
        // Filter by question bank if specified
        if (questionBankId.HasValue)
        {
            query = query.Where(q => q.QuestionBankId == questionBankId.Value);
        }
        
        // Handle subject-specific filtering for base tests
        if (moduleTypeLower.Contains("math"))
        {
            query = query.Where(q => q.Subject == "Math");
        }
        else if (moduleTypeLower.Contains("reading") || moduleTypeLower.Contains("writing"))
        {
            // Handle Reading & Writing subjects with various naming conventions
            query = query.Where(q => q.Subject == "English" || q.Subject == "Reading & Writing" || 
                                   q.Subject == "Reading" || q.Subject == "Writing" || q.Subject == "Verbal");
        }
        
        if (difficulty.HasValue)
            query = query.Where(q => q.Difficulty == difficulty.Value);

        return await query
            .OrderBy(q => Guid.NewGuid())
            .Take(questionCount)
            .ToListAsync();
    }

    private int GetTimeLimitForModule(string moduleType)
    {
        return moduleType.ToLower() switch
        {
            "base" => 1800, // 30 minutes
            "base-math" => 1920, // 32 minutes
            "base-reading-writing" => 1920, // 32 minutes
            "adaptive-easy" => 1200, // 20 minutes
            "adaptive-medium" => 1200, // 20 minutes
            "adaptive-hard" => 1500, // 25 minutes
            _ => 1800
        };
    }

    private async Task<object> CalculateIRTResults(TestSession session)
    {
        // Simplified IRT calculation - in production, this would use proper IRT algorithms
        var mathQuestions = session.Questions.Where(q => q.Subject.Contains("Math")).ToList();
        var rwQuestions = session.Questions.Where(q => !q.Subject.Contains("Math")).ToList();

        var mathCorrect = mathQuestions.Count(q => q.CorrectAnswer == q.UserAnswer);
        var rwCorrect = rwQuestions.Count(q => q.CorrectAnswer == q.UserAnswer);

        var mathAbility = mathQuestions.Count > 0 ? (double)mathCorrect / mathQuestions.Count : 0;
        var rwAbility = rwQuestions.Count > 0 ? (double)rwCorrect / rwQuestions.Count : 0;

        // Convert to theta scale (-3 to +3)
        var mathTheta = (mathAbility - 0.5) * 6;
        var rwTheta = (rwAbility - 0.5) * 6;

        var irtCalculation = new IrtCalculation
        {
            Id = Guid.NewGuid(),
            UserId = session.UserId,
            MathAbility = mathTheta,
            ReadingWritingAbility = rwTheta,
            MathStandardError = 0.3,
            ReadingWritingStandardError = 0.3,
            CalculationDate = DateTime.UtcNow
        };

        _context.IrtCalculations.Add(irtCalculation);
        await _context.SaveChangesAsync();

        return new
        {
            mathAbility = Math.Round(mathTheta, 3),
            readingWritingAbility = Math.Round(rwTheta, 3),
            mathStandardError = 0.3,
            readingWritingStandardError = 0.3,
            scaledScoreMath = Math.Round(200 + (mathTheta * 100), 0),
            scaledScoreRW = Math.Round(200 + (rwTheta * 100), 0),
            reliability = 0.85,
            calculationMethod = "Simplified IRT Model",
            calculatedAt = DateTime.UtcNow
        };
    }

    private (bool ShouldRoute, string AdaptiveModule, string Recommendation) DetermineAdaptiveRouting(int score, string moduleType)
    {
        if (moduleType != "base")
            return (false, "", "Test completed");

        return score switch
        {
            >= 80 => (true, "adaptive-hard", "High performance - proceed to advanced module"),
            >= 60 => (true, "adaptive-medium", "Good performance - proceed to intermediate module"),
            _ => (true, "adaptive-easy", "Needs improvement - proceed to foundational module")
        };
    }
}

// Request DTOs
public class StartTestSessionRequest
{
    public string ModuleType { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Guid? QuestionBankId { get; set; }
}

public class SaveProgressRequest
{
    public Guid SessionId { get; set; }
    public Dictionary<string, AnswerData> Answers { get; set; } = new();
    public int CurrentQuestionIndex { get; set; }
    public int TimeRemaining { get; set; }
}

public class SubmitTestRequest
{
    public Guid SessionId { get; set; }
    public Dictionary<string, AnswerData> Answers { get; set; } = new();
    public string ModuleType { get; set; } = string.Empty;
    public int TimeSpent { get; set; }
}

public class AnswerData
{
    public string? SelectedAnswer { get; set; }
    public int TimeSpent { get; set; }
    public bool IsFlagged { get; set; }
}

public class AdaptiveRoutingRequest
{
    public int BaseModuleScore { get; set; }
    public string Subject { get; set; } = string.Empty;
}

public class CalculateIRTRequest
{
    public Guid SessionId { get; set; }
    public List<object> Responses { get; set; } = new();
}