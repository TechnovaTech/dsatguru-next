using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class StudentAnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<StudentAnalyticsController> _logger;

    public StudentAnalyticsController(AppDbContext context, ILogger<StudentAnalyticsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet("user-statistics")]
    public async Task<IActionResult> GetUserStatistics([FromQuery] string timeframe = "all")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessions = await sessionsQuery.ToListAsync();
            var sessionQuestions = await _context.SessionQuestions
                .Where(sq => sessions.Select(s => s.Id).Contains(sq.TestSessionId))
                .ToListAsync();

            var totalQuestions = sessionQuestions.Count;
            var correctAnswers = sessionQuestions.Count(sq => sq.CorrectAnswer == sq.UserAnswer);
            var totalStudyTime = sessionQuestions.Sum(sq => sq.TimeSpent);

            var statistics = new
            {
                questionsAttempted = totalQuestions,
                correctAnswers = correctAnswers,
                accuracy = totalQuestions > 0 ? Math.Round((double)correctAnswers / totalQuestions * 100, 1) : 0,
                studyHours = Math.Round(totalStudyTime / 3600.0, 1),
                testsCompleted = sessions.Count,
                averageScore = sessions.Count > 0 ? Math.Round(sessions.Average(s => s.Score), 1) : 0,
                bestScore = sessions.Count > 0 ? sessions.Max(s => s.Score) : 0,
                totalTimeSpent = totalStudyTime,
                averageTimePerQuestion = totalQuestions > 0 ? Math.Round((double)totalStudyTime / totalQuestions, 1) : 0
            };

            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user statistics");
            return StatusCode(500, new { success = false, message = "Error retrieving user statistics" });
        }
    }

    [HttpGet("recent-activity")]
    public async Task<IActionResult> GetRecentActivity([FromQuery] int limit = 5)
    {
        try
        {
            var userId = GetCurrentUserId();
            var recentSessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .Take(limit)
                .Select(s => new
                {
                    id = s.Id,
                    type = "test",
                    title = $"{s.ModuleRoute.Replace("-", " ").ToTitleCase()} Module",
                    score = s.Score,
                    date = s.EndTime,
                    duration = s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalMinutes : 0,
                    questionsCorrect = s.CorrectAnswers,
                    totalQuestions = s.TotalQuestions
                })
                .ToListAsync();

            return Ok(new { success = true, data = recentSessions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recent activity");
            return StatusCode(500, new { success = false, message = "Error retrieving recent activity" });
        }
    }

    [HttpGet("performance-analytics")]
    public async Task<IActionResult> GetPerformanceAnalytics([FromQuery] string timeframe = "30days")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessions = await sessionsQuery
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            var performanceData = sessions.Select((s, index) => new
            {
                testNumber = index + 1,
                date = s.StartTime.ToString("yyyy-MM-dd"),
                score = s.Score,
                moduleType = s.ModuleRoute,
                accuracy = s.TotalQuestions > 0 ? Math.Round((double)s.CorrectAnswers / s.TotalQuestions * 100, 1) : 0,
                timeSpent = s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalMinutes : 0
            }).ToList();

            var analytics = new
            {
                performanceOverTime = performanceData,
                averageScore = sessions.Count > 0 ? Math.Round(sessions.Average(s => s.Score), 1) : 0,
                scoreImprovement = CalculateScoreImprovement(sessions),
                consistencyScore = CalculateConsistencyScore(sessions),
                totalTests = sessions.Count
            };

            return Ok(new { success = true, data = analytics });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving performance analytics");
            return StatusCode(500, new { success = false, message = "Error retrieving performance analytics" });
        }
    }

    [HttpGet("subject-performance")]
    public async Task<IActionResult> GetSubjectPerformance([FromQuery] string timeframe = "all")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessionIds = await sessionsQuery.Select(s => s.Id).ToListAsync();
            
            var questionsBySubject = await _context.SessionQuestions
                .Where(sq => sessionIds.Contains(sq.TestSessionId))
                .GroupBy(sq => sq.Subject)
                .Select(g => new
                {
                    subject = g.Key,
                    totalQuestions = g.Count(),
                    correctAnswers = g.Count(sq => sq.CorrectAnswer == sq.UserAnswer),
                    accuracy = g.Count() > 0 ? Math.Round((double)g.Count(sq => sq.CorrectAnswer == sq.UserAnswer) / g.Count() * 100, 1) : 0,
                    averageTime = g.Count() > 0 ? Math.Round(g.Average(sq => sq.TimeSpent), 1) : 0,
                    difficultyBreakdown = g.GroupBy(sq => sq.Difficulty)
                        .Select(d => new
                        {
                            difficulty = d.Key.ToString(),
                            correct = d.Count(sq => sq.CorrectAnswer == sq.UserAnswer),
                            total = d.Count(),
                            accuracy = d.Count() > 0 ? Math.Round((double)d.Count(sq => sq.CorrectAnswer == sq.UserAnswer) / d.Count() * 100, 1) : 0
                        }).ToList()
                })
                .ToListAsync();

            return Ok(new { success = true, data = questionsBySubject });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving subject performance");
            return StatusCode(500, new { success = false, message = "Error retrieving subject performance" });
        }
    }

    [HttpGet("test-session-analysis/{sessionId}")]
    public async Task<IActionResult> GetTestSessionAnalysis(Guid sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var session = await _context.TestSessions
                .Include(s => s.Questions)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Test session not found" });

            var analysis = new
            {
                sessionInfo = new
                {
                    id = session.Id,
                    moduleType = session.ModuleRoute,
                    startTime = session.StartTime,
                    endTime = session.EndTime,
                    totalTime = session.EndTime.HasValue ? (int)(session.EndTime.Value - session.StartTime).TotalSeconds : 0
                },
                scoreAnalysis = new
                {
                    rawScore = session.CorrectAnswers,
                    totalQuestions = session.TotalQuestions,
                    percentage = session.Score,
                    accuracy = session.TotalQuestions > 0 ? Math.Round((double)session.CorrectAnswers / session.TotalQuestions * 100, 1) : 0
                },
                timeAnalysis = new
                {
                    totalTime = session.Questions.Sum(q => q.TimeSpent),
                    averageTimePerQuestion = session.Questions.Count > 0 ? Math.Round(session.Questions.Average(q => q.TimeSpent), 1) : 0,
                    fastestQuestion = session.Questions.Count > 0 ? session.Questions.Min(q => q.TimeSpent) : 0,
                    slowestQuestion = session.Questions.Count > 0 ? session.Questions.Max(q => q.TimeSpent) : 0
                },
                subjectBreakdown = session.Questions
                    .GroupBy(q => q.Subject)
                    .Select(g => new
                    {
                        subject = g.Key,
                        correct = g.Count(q => q.CorrectAnswer == q.UserAnswer),
                        total = g.Count(),
                        accuracy = g.Count() > 0 ? Math.Round((double)g.Count(q => q.CorrectAnswer == q.UserAnswer) / g.Count() * 100, 1) : 0
                    }).ToList(),
                difficultyBreakdown = session.Questions
                    .GroupBy(q => q.Difficulty)
                    .Select(g => new
                    {
                        difficulty = g.Key.ToString(),
                        correct = g.Count(q => q.CorrectAnswer == q.UserAnswer),
                        total = g.Count(),
                        accuracy = g.Count() > 0 ? Math.Round((double)g.Count(q => q.CorrectAnswer == q.UserAnswer) / g.Count() * 100, 1) : 0
                    }).ToList()
            };

            return Ok(new { success = true, data = analysis });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving test session analysis");
            return StatusCode(500, new { success = false, message = "Error retrieving test session analysis" });
        }
    }

    [HttpGet("progress/{moduleId}")]
    public async Task<IActionResult> GetProgressTracking(Guid moduleId, [FromQuery] string timeframe = "30days")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessions = await sessionsQuery
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            var weeklyProgress = sessions
                .GroupBy(s => GetWeekOfYear(s.StartTime))
                .Select(g => new
                {
                    week = g.Key,
                    testsCompleted = g.Count(),
                    averageScore = Math.Round(g.Average(s => s.Score), 1),
                    totalQuestions = g.Sum(s => s.TotalQuestions),
                    totalCorrect = g.Sum(s => s.CorrectAnswers),
                    accuracy = g.Sum(s => s.TotalQuestions) > 0 ? Math.Round((double)g.Sum(s => s.CorrectAnswers) / g.Sum(s => s.TotalQuestions) * 100, 1) : 0
                })
                .OrderBy(w => w.week)
                .ToList();

            var progress = new
            {
                moduleId = moduleId,
                weeklyProgress = weeklyProgress,
                overallTrend = CalculateOverallTrend(sessions),
                improvementAreas = GetImprovementAreas(userId),
                goals = GetUserGoals(userId)
            };

            return Ok(new { success = true, data = progress });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving progress tracking");
            return StatusCode(500, new { success = false, message = "Error retrieving progress tracking" });
        }
    }

    [HttpGet("progress-tracking")]
    public async Task<IActionResult> GetProgressTracking([FromQuery] string timeframe = "30days")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessions = await sessionsQuery
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            var weeklyProgress = sessions
                .GroupBy(s => GetWeekOfYear(s.StartTime))
                .Select(g => new
                {
                    week = g.Key,
                    testsCompleted = g.Count(),
                    averageScore = Math.Round(g.Average(s => s.Score), 1),
                    totalQuestions = g.Sum(s => s.TotalQuestions),
                    totalCorrect = g.Sum(s => s.CorrectAnswers),
                    accuracy = g.Sum(s => s.TotalQuestions) > 0 ? Math.Round((double)g.Sum(s => s.CorrectAnswers) / g.Sum(s => s.TotalQuestions) * 100, 1) : 0
                })
                .OrderBy(w => w.week)
                .ToList();

            var progress = new
            {
                weeklyProgress = weeklyProgress,
                overallTrend = CalculateOverallTrend(sessions),
                improvementAreas = GetImprovementAreas(userId),
                goals = GetUserGoals(userId)
            };

            return Ok(new { success = true, data = progress });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving progress tracking");
            return StatusCode(500, new { success = false, message = "Error retrieving progress tracking" });
        }
    }

    [HttpGet("study-time-analytics")]
    public async Task<IActionResult> GetStudyTimeAnalytics([FromQuery] string timeframe = "30days")
    {
        try
        {
            var userId = GetCurrentUserId();
            var startDate = GetStartDateForTimeframe(timeframe);

            var sessionsQuery = _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue);

            if (startDate.HasValue)
                sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);

            var sessions = await sessionsQuery.ToListAsync();
            var sessionQuestions = await _context.SessionQuestions
                .Where(sq => sessions.Select(s => s.Id).Contains(sq.TestSessionId))
                .ToListAsync();

            var dailyStudyTime = sessions
                .GroupBy(s => s.StartTime.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    totalTime = g.Sum(s => s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalMinutes : 0),
                    sessionsCount = g.Count()
                })
                .OrderBy(d => d.date)
                .ToList();

            var analytics = new
            {
                dailyStudyTime = dailyStudyTime,
                totalStudyTime = sessions.Sum(s => s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalMinutes : 0),
                averageSessionTime = sessions.Count > 0 ? Math.Round(sessions.Average(s => s.EndTime.HasValue ? (s.EndTime.Value - s.StartTime).TotalMinutes : 0), 1) : 0,
                totalSessions = sessions.Count,
                averageQuestionsPerSession = sessions.Count > 0 ? Math.Round(sessions.Average(s => s.TotalQuestions), 1) : 0
            };

            return Ok(new { success = true, data = analytics });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving study time analytics");
            return StatusCode(500, new { success = false, message = "Error retrieving study time analytics" });
        }
    }

    [HttpGet("irt-analysis")]
    public async Task<IActionResult> GetIRTAnalysis()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Get recent test sessions for IRT analysis
            var recentSessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .Take(10)
                .ToListAsync();

            if (!recentSessions.Any())
            {
                return Ok(new { success = true, data = new { message = "No test data available for IRT analysis" } });
            }

            // Get IRT calculations if available
            var irtCalculations = await _context.IrtCalculations
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.CalculationDate)
                .Take(10)
                .ToListAsync();

            var irtAnalysis = new
            {
                overallAbility = new
                {
                    mathAbility = irtCalculations.Any() ? Math.Round(irtCalculations.Average(i => i.MathAbility), 3) : 0,
                    readingWritingAbility = irtCalculations.Any() ? Math.Round(irtCalculations.Average(i => i.ReadingWritingAbility), 3) : 0,
                    reliability = 0.85
                },
                abilityTrend = irtCalculations.OrderBy(i => i.CalculationDate).Select(i => new
                {
                    date = i.CalculationDate.ToString("yyyy-MM-dd"),
                    mathAbility = Math.Round(i.MathAbility, 3),
                    readingWritingAbility = Math.Round(i.ReadingWritingAbility, 3)
                }).ToList(),
                standardErrors = new
                {
                    mathStandardError = irtCalculations.Any() ? Math.Round(irtCalculations.Average(i => i.MathStandardError), 3) : 0,
                    readingWritingStandardError = irtCalculations.Any() ? Math.Round(irtCalculations.Average(i => i.ReadingWritingStandardError), 3) : 0
                },
                recommendations = GetIRTRecommendations(irtCalculations)
            };

            return Ok(new { success = true, data = irtAnalysis });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving IRT analysis");
            return StatusCode(500, new { success = false, message = "Error retrieving IRT analysis" });
        }
    }

    [HttpGet("difficulty-analysis")]
    public async Task<IActionResult> GetDifficultyAnalysis()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var sessionIds = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .Select(s => s.Id)
                .ToListAsync();

            var questionsByDifficulty = await _context.SessionQuestions
                .Where(sq => sessionIds.Contains(sq.TestSessionId))
                .GroupBy(sq => sq.Difficulty)
                .Select(g => new
                {
                    difficulty = g.Key.ToString(),
                    totalQuestions = g.Count(),
                    correctAnswers = g.Count(sq => sq.CorrectAnswer == sq.UserAnswer),
                    accuracy = g.Count() > 0 ? Math.Round((double)g.Count(sq => sq.CorrectAnswer == sq.UserAnswer) / g.Count() * 100, 1) : 0,
                    averageTimePerQuestion = g.Count() > 0 ? Math.Round(g.Average(sq => sq.TimeSpent), 1) : 0,
                    subjectBreakdown = g.GroupBy(sq => sq.Subject)
                        .Select(sg => new
                        {
                            subject = sg.Key,
                            totalQuestions = sg.Count(),
                            correctAnswers = sg.Count(sq => sq.CorrectAnswer == sq.UserAnswer),
                            accuracy = sg.Count() > 0 ? Math.Round((double)sg.Count(sq => sq.CorrectAnswer == sq.UserAnswer) / sg.Count() * 100, 1) : 0
                        }).ToList()
                })
                .OrderBy(d => d.difficulty == "Easy" ? 1 : d.difficulty == "Medium" ? 2 : 3)
                .ToListAsync();

            var difficultyProgression = new
            {
                currentLevel = GetCurrentDifficultyLevel(questionsByDifficulty),
                recommendations = GetDifficultyRecommendations(questionsByDifficulty),
                strengthsAndWeaknesses = GetDifficultyStrengthsWeaknesses(questionsByDifficulty)
            };

            var analysis = new
            {
                difficultyBreakdown = questionsByDifficulty,
                difficultyProgression = difficultyProgression,
                overallPerformance = new
                {
                    strongestDifficulty = questionsByDifficulty.OrderByDescending(d => d.accuracy).FirstOrDefault()?.difficulty ?? "None",
                    weakestDifficulty = questionsByDifficulty.OrderBy(d => d.accuracy).FirstOrDefault()?.difficulty ?? "None",
                    averageAccuracy = questionsByDifficulty.Any() ? Math.Round(questionsByDifficulty.Average(d => d.accuracy), 1) : 0
                }
            };

            return Ok(new { success = true, data = analysis });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving difficulty analysis");
            return StatusCode(500, new { success = false, message = "Error retrieving difficulty analysis" });
        }
    }

    [HttpGet("learning-recommendations")]
    public async Task<IActionResult> GetLearningRecommendations()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Get recent performance data
            var recentSessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .Take(5)
                .ToListAsync();

            var recommendations = GenerateLearningRecommendations(recentSessions, userId);

            return Ok(new { success = true, data = recommendations });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving learning recommendations");
            return StatusCode(500, new { success = false, message = "Error retrieving learning recommendations" });
        }
    }

    [HttpGet("adaptive-performance")]
    public async Task<IActionResult> GetAdaptiveTestPerformance()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Get adaptive test sessions
            var adaptiveSessions = await _context.TestSessions
                .Include(s => s.Questions)
                .Where(s => s.UserId == userId && s.EndTime.HasValue && 
                       (s.ModuleRoute.Contains("adaptive") || s.ModuleRoute.Contains("Adaptive")))
                .OrderByDescending(s => s.EndTime)
                .ToListAsync();

            var performanceData = new
            {
                totalAdaptiveTests = adaptiveSessions.Count,
                averageScore = adaptiveSessions.Count > 0 ? Math.Round(adaptiveSessions.Average(s => s.Score), 1) : 0,
                bestScore = adaptiveSessions.Count > 0 ? adaptiveSessions.Max(s => s.Score) : 0,
                recentPerformance = adaptiveSessions.Take(10).Select(s => new
                {
                    sessionId = s.Id,
                    moduleType = s.ModuleRoute,
                    score = s.Score,
                    accuracy = s.TotalQuestions > 0 ? Math.Round((double)s.CorrectAnswers / s.TotalQuestions * 100, 1) : 0,
                    completedAt = s.EndTime,
                    timeSpent = s.EndTime.HasValue ? (int)(s.EndTime.Value - s.StartTime).TotalMinutes : 0
                }).ToList(),
                difficultyProgression = adaptiveSessions
                    .GroupBy(s => s.ModuleRoute)
                    .Select(g => new
                    {
                        difficulty = g.Key,
                        testsCompleted = g.Count(),
                        averageScore = Math.Round(g.Average(s => s.Score), 1),
                        bestScore = g.Max(s => s.Score),
                        improvement = CalculateImprovementTrend(g.OrderBy(s => s.StartTime).ToList())
                    }).ToList(),
                subjectPerformance = adaptiveSessions
                    .SelectMany(s => s.Questions)
                    .GroupBy(q => q.Subject)
                    .Select(g => new
                    {
                        subject = g.Key,
                        totalQuestions = g.Count(),
                        correctAnswers = g.Count(q => q.CorrectAnswer == q.UserAnswer),
                        accuracy = g.Count() > 0 ? Math.Round((double)g.Count(q => q.CorrectAnswer == q.UserAnswer) / g.Count() * 100, 1) : 0,
                        averageTimePerQuestion = g.Count() > 0 ? Math.Round(g.Average(q => q.TimeSpent), 1) : 0
                    }).ToList()
            };

            return Ok(new { success = true, data = performanceData });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving adaptive test performance");
            return StatusCode(500, new { success = false, message = "Error retrieving adaptive test performance" });
        }
    }

    // Helper methods
    private DateTime? GetStartDateForTimeframe(string timeframe)
    {
        return timeframe.ToLower() switch
        {
            "7days" => DateTime.UtcNow.AddDays(-7),
            "30days" => DateTime.UtcNow.AddDays(-30),
            "90days" => DateTime.UtcNow.AddDays(-90),
            "1year" => DateTime.UtcNow.AddYears(-1),
            _ => null
        };
    }

    private double CalculateImprovementTrend(List<TestSession> sessions)
    {
        if (sessions.Count < 2) return 0;
        
        var firstScore = sessions.First().Score;
        var lastScore = sessions.Last().Score;
        
        return Math.Round((double)(lastScore - firstScore), 1);
    }

    private List<string> GetIRTRecommendations(List<IrtCalculation> irtCalculations)
    {
        var recommendations = new List<string>();
        
        if (!irtCalculations.Any())
        {
            recommendations.Add("Take more practice tests to generate IRT analysis data");
            return recommendations;
        }
        
        var avgMathAbility = irtCalculations.Average(i => i.MathAbility);
        var avgReadingAbility = irtCalculations.Average(i => i.ReadingWritingAbility);
        
        if (avgMathAbility < -0.5)
        {
            recommendations.Add("Focus on fundamental math concepts and practice easier problems");
        }
        else if (avgMathAbility > 0.5)
        {
            recommendations.Add("Challenge yourself with advanced math problems");
        }
        
        if (avgReadingAbility < -0.5)
        {
            recommendations.Add("Work on reading comprehension and vocabulary building");
        }
        else if (avgReadingAbility > 0.5)
        {
            recommendations.Add("Practice complex reading passages and advanced writing techniques");
        }
        
        return recommendations;
    }
    
    private string GetCurrentDifficultyLevel(dynamic questionsByDifficulty)
    {
        var difficultyList = questionsByDifficulty as IEnumerable<dynamic>;
        if (difficultyList == null || !difficultyList.Any()) return "Beginner";
        
        var bestDifficulty = difficultyList.OrderByDescending(d => d.accuracy).First();
        return bestDifficulty.difficulty;
    }
    
    private List<string> GetDifficultyRecommendations(dynamic questionsByDifficulty)
    {
        var recommendations = new List<string>();
        var difficultyList = questionsByDifficulty as IEnumerable<dynamic>;
        
        if (difficultyList == null || !difficultyList.Any())
        {
            recommendations.Add("Start with practice tests to assess your current level");
            return recommendations;
        }
        
        var weakestDifficulty = difficultyList.OrderBy(d => d.accuracy).First();
        var strongestDifficulty = difficultyList.OrderByDescending(d => d.accuracy).First();
        
        if (weakestDifficulty.accuracy < 60)
        {
            recommendations.Add($"Focus more practice on {weakestDifficulty.difficulty} level questions");
        }
        
        if (strongestDifficulty.accuracy > 80)
        {
            recommendations.Add($"You're excelling at {strongestDifficulty.difficulty} questions - consider advancing to the next level");
        }
        
        return recommendations;
    }
    
    private Dictionary<string, object> GetDifficultyStrengthsWeaknesses(dynamic questionsByDifficulty)
    {
        var difficultyList = questionsByDifficulty as IEnumerable<dynamic>;
        var result = new Dictionary<string, object>();
        
        if (difficultyList == null || !difficultyList.Any())
        {
            result["strengths"] = new List<string>();
            result["weaknesses"] = new List<string>();
            return result;
        }
        
        var strengths = new List<string>();
        var weaknesses = new List<string>();
        
        foreach (var difficulty in difficultyList)
        {
            if (difficulty.accuracy >= 75)
            {
                strengths.Add($"{difficulty.difficulty} level questions ({difficulty.accuracy}% accuracy)");
            }
            else if (difficulty.accuracy < 60)
            {
                weaknesses.Add($"{difficulty.difficulty} level questions ({difficulty.accuracy}% accuracy)");
            }
        }
        
        result["strengths"] = strengths;
        result["weaknesses"] = weaknesses;
        return result;
    }

    private double CalculateScoreImprovement(List<TestSession> sessions)
    {
        if (sessions.Count < 2) return 0;
        
        var firstHalf = sessions.Take(sessions.Count / 2).Average(s => s.Score);
        var secondHalf = sessions.Skip(sessions.Count / 2).Average(s => s.Score);
        
        return Math.Round(secondHalf - firstHalf, 1);
    }

    private double CalculateConsistencyScore(List<TestSession> sessions)
    {
        if (sessions.Count < 2) return 100;
        
        var scores = sessions.Select(s => (double)s.Score).ToList();
        var mean = scores.Average();
        var variance = scores.Sum(s => Math.Pow(s - mean, 2)) / scores.Count;
        var standardDeviation = Math.Sqrt(variance);
        
        // Convert to consistency score (lower std dev = higher consistency)
        return Math.Round(Math.Max(0, 100 - standardDeviation), 1);
    }

    private string GetWeekOfYear(DateTime date)
    {
        var jan1 = new DateTime(date.Year, 1, 1);
        var daysOffset = DayOfWeek.Thursday - jan1.DayOfWeek;
        var firstThursday = jan1.AddDays(daysOffset);
        var cal = System.Globalization.CultureInfo.CurrentCulture.Calendar;
        var firstWeek = cal.GetWeekOfYear(firstThursday, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        var weekNum = cal.GetWeekOfYear(date, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        return $"{date.Year}-W{weekNum:D2}";
    }

    private object CalculateOverallTrend(List<TestSession> sessions)
    {
        if (sessions.Count < 2)
            return new { trend = "insufficient_data", description = "Not enough data to determine trend" };

        var improvement = CalculateScoreImprovement(sessions);
        
        return improvement switch
        {
            > 5 => new { trend = "improving", description = "Performance is improving over time" },
            < -5 => new { trend = "declining", description = "Performance needs attention" },
            _ => new { trend = "stable", description = "Performance is consistent" }
        };
    }

    private List<string> GetImprovementAreas(Guid userId)
    {
        // This would analyze user's weak areas based on performance data
        return new List<string>
        {
            "Complex problem solving",
            "Time management",
            "Reading comprehension"
        };
    }

    private List<object> GetUserGoals(Guid userId)
    {
        // This would retrieve user-set goals from the database
        return new List<object>
        {
            new { goal = "Achieve 85% accuracy", progress = 78, target = 85 },
            new { goal = "Complete 10 tests this month", progress = 7, target = 10 }
        };
    }

    private object GenerateLearningRecommendations(List<TestSession> recentSessions, Guid userId)
    {
        var averageScore = recentSessions.Count > 0 ? recentSessions.Average(s => s.Score) : 0;
        
        var recommendations = new List<string>();
        var focusAreas = new List<string>();
        var studyPlan = new List<object>();

        if (averageScore < 70)
        {
            recommendations.Add("Focus on fundamental concepts");
            recommendations.Add("Practice with easier problems");
            focusAreas.Add("Basic concepts");
            focusAreas.Add("Problem-solving strategies");
        }
        else if (averageScore < 85)
        {
            recommendations.Add("Work on advanced techniques");
            recommendations.Add("Improve time management");
            focusAreas.Add("Advanced problems");
            focusAreas.Add("Speed and accuracy");
        }
        else
        {
            recommendations.Add("Maintain current performance");
            recommendations.Add("Focus on test strategies");
            focusAreas.Add("Test-taking strategies");
            focusAreas.Add("Consistency");
        }

        studyPlan.Add(new { day = "Monday", activity = "Practice test", duration = 60 });
        studyPlan.Add(new { day = "Wednesday", activity = "Review weak areas", duration = 45 });
        studyPlan.Add(new { day = "Friday", activity = "Timed practice", duration = 90 });

        return new
        {
            recommendations = recommendations,
            focusAreas = focusAreas,
            studyPlan = studyPlan,
            nextMilestone = "Achieve consistent 80%+ scores",
            estimatedTimeToGoal = "2-3 weeks with regular practice"
        };
    }
}

// Extension method for string formatting
public static class StringExtensions
{
    public static string ToTitleCase(this string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
    }
}