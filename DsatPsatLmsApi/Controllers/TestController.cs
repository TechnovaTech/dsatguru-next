using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using DsatPsatLmsApi.Services;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/test")]
[Authorize]
public class TestController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAdaptiveTestService _adaptiveTestService;

    public TestController(AppDbContext context, IAdaptiveTestService adaptiveTestService)
    {
        _context = context;
        _adaptiveTestService = adaptiveTestService;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { message = "Adaptive Test API is working!", timestamp = DateTime.UtcNow });
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartTest([FromBody] AdaptiveStartTestRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            // Check if user can take the test
            var canRetake = await _adaptiveTestService.CanUserRetakeTestAsync(userId);
            if (!canRetake)
            {
                return BadRequest(new { message = "You have reached the maximum number of attempts or need to wait before retaking" });
            }

            // Get active configuration
            var config = await _adaptiveTestService.GetActiveConfigAsync();
            if (config == null)
            {
                return BadRequest(new { message = "No active adaptive test configuration found" });
            }

            // Start test attempt
            var testAttempt = await _adaptiveTestService.StartTestAttemptAsync(userId, config.Id);

            // Create base test session
            var baseTestSession = new TestSession
            {
                UserId = userId,
                ModuleRoute = "Base",
                StartTime = DateTime.UtcNow
            };

            _context.TestSessions.Add(baseTestSession);
            await _context.SaveChangesAsync();

            // Update test attempt with base session
            testAttempt.BaseTestSessionId = baseTestSession.Id;
            await _context.SaveChangesAsync();

            // Get base test questions
            var baseQuestions = await _context.Questions
                .Where(q => q.TestType == TestType.Base)
                .OrderBy(q => Guid.NewGuid())
                .Take(request.QuestionCount ?? 20)
                .ToListAsync();

            return Ok(new
            {
                testAttemptId = testAttempt.Id,
                testSessionId = baseTestSession.Id,
                questions = baseQuestions.Select(q => new
                {
                    q.Id,
                    q.Content,
                    q.Subject,
                    q.Difficulty,
                            q.Points,
                            q.Type,
                    Options = q.Options?.Split('|') ?? new string[0]
                }),
                duration = config.BaseTestDuration,
                testType = "Base"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error starting test", error = ex.Message });
        }
    }

    [HttpPost("base/submit")]
    public async Task<IActionResult> SubmitBaseTest([FromBody] AdaptiveSubmitTestRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            // Get test session and test attempt
            var testSession = await _context.TestSessions
                .FirstOrDefaultAsync(ts => ts.Id == request.TestSessionId && ts.UserId == userId);

            if (testSession == null)
            {
                return NotFound(new { message = "Test session not found" });
            }

            var testAttempt = await _context.TestAttempts
                .Include(ta => ta.AdaptiveConfig)
                .FirstOrDefaultAsync(ta => ta.BaseTestSessionId == request.TestSessionId);

            if (testAttempt == null)
            {
                return NotFound(new { message = "Test attempt not found" });
            }

            // Save user responses
            foreach (var response in request.Responses)
            {
                var question = await _context.Questions.FindAsync(response.QuestionId);
                if (question == null) continue;

                var sessionQuestion = new SessionQuestion
                {
                    TestSessionId = testSession.Id,
                    Content = question.Content,
                    Subject = question.Subject,
                    Difficulty = question.Difficulty,
                    CorrectAnswer = question.CorrectAnswer,
                    UserAnswer = response.UserAnswer,
                    TimeSpent = response.TimeSpent
                };

                _context.SessionQuestions.Add(sessionQuestion);
            }

            // Update test session
            testSession.EndTime = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();

            // Evaluate base test and determine adaptive level
            var adaptiveLevel = await _adaptiveTestService.EvaluateBaseTestAsync(testSession.Id, testAttempt.AdaptiveConfig);
            testAttempt.CurrentLevel = adaptiveLevel;
            testAttempt.BaseTestScore = (int?)await CalculateSessionScoreAsync(testSession.Id);

            await _context.SaveChangesAsync();

            // Get adaptive questions for next level
            var adaptiveQuestions = await _adaptiveTestService.GetAdaptiveQuestionsAsync(
                adaptiveLevel, 
                request.Subject ?? "Math", 
                testAttempt.AdaptiveConfig.QuestionsPerAdaptiveTest
            );

            // Create adaptive test session 1
            var adaptive1Session = new TestSession
            {
                UserId = userId,
                ModuleRoute = adaptiveLevel.ToString(),
                StartTime = DateTime.UtcNow
            };

            _context.TestSessions.Add(adaptive1Session);
            await _context.SaveChangesAsync();

            testAttempt.Adaptive1SessionId = adaptive1Session.Id;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Base test submitted successfully",
                adaptiveLevel = adaptiveLevel.ToString(),
                baseScore = testAttempt.BaseTestScore,
                nextPhase = new
                {
                    testSessionId = adaptive1Session.Id,
                    questions = adaptiveQuestions.Select(q => new
                    {
                        q.Id,
                        q.Content,
                        q.Subject,
                        q.Difficulty,
                            q.Points,
                            q.Type,
                        Options = q.Options?.Split('|') ?? new string[0]
                    }),
                    duration = testAttempt.AdaptiveConfig.Adaptive1Duration,
                    testType = "Adaptive1"
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error submitting base test", error = ex.Message });
        }
    }

    [HttpPost("adaptive/submit")]
    public async Task<IActionResult> SubmitAdaptiveTest([FromBody] AdaptiveSubmitTestRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            // Get test session and test attempt
            var testSession = await _context.TestSessions
                .FirstOrDefaultAsync(ts => ts.Id == request.TestSessionId && ts.UserId == userId);

            if (testSession == null)
            {
                return NotFound(new { message = "Test session not found" });
            }

            var testAttempt = await _context.TestAttempts
                .Include(ta => ta.AdaptiveConfig)
                .Where(ta => ta.Adaptive1SessionId == request.TestSessionId || ta.Adaptive2SessionId == request.TestSessionId)
                .FirstOrDefaultAsync();

            if (testAttempt == null)
            {
                return NotFound(new { message = "Test attempt not found" });
            }

            // Save user responses
            foreach (var response in request.Responses)
            {
                var question = await _context.Questions.FindAsync(response.QuestionId);
                if (question == null) continue;

                var sessionQuestion = new SessionQuestion
                {
                    TestSessionId = testSession.Id,
                    Content = question.Content,
                    Subject = question.Subject,
                    Difficulty = question.Difficulty,
                    CorrectAnswer = question.CorrectAnswer,
                    UserAnswer = response.UserAnswer,
                    TimeSpent = response.TimeSpent
                };

                _context.SessionQuestions.Add(sessionQuestion);
            }

            // Update test session
            testSession.EndTime = DateTime.UtcNow;
            // TotalTimeSpent property doesn't exist in TestSession model
            
            await _context.SaveChangesAsync();

            // Check if this is Adaptive1 or Adaptive2
            bool isAdaptive1 = testAttempt.Adaptive1SessionId == request.TestSessionId;
            
            if (isAdaptive1)
            {
                // Calculate Adaptive1 score
                testAttempt.Adaptive1Score = (int?)await CalculateSessionScoreAsync(testSession.Id);

                // Create Adaptive2 session
                var adaptive2Questions = await _adaptiveTestService.GetAdaptiveQuestionsAsync(
                    testAttempt.CurrentLevel,
                    request.Subject ?? "Reading",
                    testAttempt.AdaptiveConfig.QuestionsPerAdaptiveTest
                );

                var adaptive2Session = new TestSession
                {
                    UserId = userId,
                    ModuleRoute = testAttempt.CurrentLevel.ToString(),
                    StartTime = DateTime.UtcNow
                };

                _context.TestSessions.Add(adaptive2Session);
                await _context.SaveChangesAsync();

                testAttempt.Adaptive2SessionId = adaptive2Session.Id;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Adaptive test 1 submitted successfully",
                    adaptive1Score = testAttempt.Adaptive1Score,
                    nextPhase = new
                    {
                        testSessionId = adaptive2Session.Id,
                        questions = adaptive2Questions.Select(q => new
                        {
                            q.Id,
                            q.Content,
                            q.Subject,
                            q.Difficulty,
                            q.Points,
                            q.Type,
                            Options = q.Options?.Split('|') ?? new string[0]
                        }),
                        duration = testAttempt.AdaptiveConfig.Adaptive2Duration,
                        testType = "Adaptive2"
                    }
                });
            }
            else
            {
                // This is Adaptive2 - calculate final results
                testAttempt.Adaptive2Score = (int?)await CalculateSessionScoreAsync(testSession.Id);
                
                var finalResult = await _adaptiveTestService.CalculateFinalScoreAsync(testAttempt.Id);
                
                // Generate study recommendations
                var recommendations = await _adaptiveTestService.GenerateStudyRecommendationsAsync(testAttempt.Id);
                testAttempt.StudyPlanGenerated = true;
                
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Test completed successfully",
                    finalResult = new
                    {
                        finalResult.TestAttemptId,
                        finalResult.BaseScore,
                        finalResult.Adaptive1Score,
                        finalResult.Adaptive2Score,
                        finalResult.FinalScore,
                        finalResult.AdaptiveLevel,
                        finalResult.CompletedAt,
                        finalResult.TotalTimeSpent,
                        studyRecommendations = recommendations
                    }
                });
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error submitting adaptive test", error = ex.Message });
        }
    }

    [HttpGet("results/{testAttemptId}")]
    public async Task<IActionResult> GetTestResults(Guid testAttemptId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            var testAttempt = await _context.TestAttempts
                .Include(ta => ta.User)
                .Include(ta => ta.AdaptiveConfig)
                .FirstOrDefaultAsync(ta => ta.Id == testAttemptId && ta.UserId == userId);

            if (testAttempt == null)
            {
                return NotFound(new { message = "Test results not found" });
            }

            var recommendations = await _adaptiveTestService.GenerateStudyRecommendationsAsync(testAttemptId);

            return Ok(new
            {
                testAttempt.Id,
                testAttempt.AttemptNumber,
                testAttempt.BaseTestScore,
                testAttempt.Adaptive1Score,
                testAttempt.Adaptive2Score,
                testAttempt.FinalScore,
                testAttempt.CurrentLevel,
                testAttempt.Status,
                testAttempt.StartedAt,
                testAttempt.CompletedAt,
                testAttempt.TotalTimeSpent,
                studyRecommendations = recommendations,
                canRetake = await _adaptiveTestService.CanUserRetakeTestAsync(userId)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving test results", error = ex.Message });
        }
    }

    [HttpGet("user/study-plan")]
    public async Task<IActionResult> GetUserStudyPlan()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            var latestAttempt = await _context.TestAttempts
                .Where(ta => ta.UserId == userId && ta.Status == TestAttemptStatus.Completed)
                .OrderByDescending(ta => ta.CompletedAt)
                .FirstOrDefaultAsync();

            if (latestAttempt == null)
            {
                return NotFound(new { message = "No completed test attempts found" });
            }

            var recommendations = await _adaptiveTestService.GenerateStudyRecommendationsAsync(latestAttempt.Id);

            return Ok(new
            {
                testAttemptId = latestAttempt.Id,
                finalScore = latestAttempt.FinalScore,
                adaptiveLevel = latestAttempt.CurrentLevel,
                completedAt = latestAttempt.CompletedAt,
                studyRecommendations = recommendations,
                suggestedActions = GetSuggestedActions(latestAttempt.FinalScore ?? 0)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving study plan", error = ex.Message });
        }
    }

    private async Task<double> CalculateSessionScoreAsync(Guid testSessionId)
    {
        var sessionQuestions = await _context.SessionQuestions
            .Where(sq => sq.TestSessionId == testSessionId)
            .ToListAsync();

        if (!sessionQuestions.Any())
            return 0;

        var correctAnswers = sessionQuestions.Count(sq => sq.UserAnswer == sq.CorrectAnswer);
        return (double)correctAnswers / sessionQuestions.Count * 100;
    }

    private List<string> GetSuggestedActions(double finalScore)
    {
        var actions = new List<string>();

        if (finalScore < 60)
        {
            actions.Add("Review fundamental concepts");
            actions.Add("Practice with easier questions");
            actions.Add("Consider additional tutoring");
        }
        else if (finalScore < 80)
        {
            actions.Add("Focus on weak subject areas");
            actions.Add("Practice medium difficulty problems");
            actions.Add("Improve time management");
        }
        else
        {
            actions.Add("Maintain current performance");
            actions.Add("Challenge yourself with harder problems");
            actions.Add("Help others to reinforce learning");
        }

        return actions;
    }
}

public class AdaptiveStartTestRequest
{
    public int? QuestionCount { get; set; }
    public string? Subject { get; set; }
}

public class AdaptiveSubmitTestRequest
{
    public Guid TestSessionId { get; set; }
    public List<AdaptiveTestResponse> Responses { get; set; } = new();
    public int TotalTimeSpent { get; set; }
    public string? Subject { get; set; }
}

public class AdaptiveTestResponse
{
    public Guid QuestionId { get; set; }
    public string UserAnswer { get; set; } = string.Empty;
    public int TimeSpent { get; set; }
}