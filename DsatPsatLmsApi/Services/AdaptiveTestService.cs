using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Services;

public interface IAdaptiveTestService
{
    Task<AdaptiveConfig?> GetActiveConfigAsync();
    Task<TestAttempt> StartTestAttemptAsync(Guid userId, Guid configId);
    Task<AdaptiveLevel> EvaluateBaseTestAsync(Guid testSessionId, AdaptiveConfig config);
    Task<List<Question>> GetAdaptiveQuestionsAsync(AdaptiveLevel level, string subject, int count);
    Task<TestAttemptResult> CalculateFinalScoreAsync(Guid testAttemptId);
    Task<bool> CanUserRetakeTestAsync(Guid userId);
    Task<List<string>> GenerateStudyRecommendationsAsync(Guid testAttemptId);
}

public class AdaptiveTestService : IAdaptiveTestService
{
    private readonly AppDbContext _context;

    public AdaptiveTestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AdaptiveConfig?> GetActiveConfigAsync()
    {
        return await _context.AdaptiveConfigs
            .Where(c => c.IsActive)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<TestAttempt> StartTestAttemptAsync(Guid userId, Guid configId)
    {
        var testAttempt = new TestAttempt
        {
            UserId = userId,
            AdaptiveConfigId = configId,
            Status = TestAttemptStatus.BaseTestInProgress,
            CurrentLevel = AdaptiveLevel.Base,
            AttemptNumber = await GetNextAttemptNumberAsync(userId),
            StartedAt = DateTime.UtcNow
        };

        _context.TestAttempts.Add(testAttempt);
        await _context.SaveChangesAsync();

        return testAttempt;
    }

    public async Task<AdaptiveLevel> EvaluateBaseTestAsync(Guid testSessionId, AdaptiveConfig config)
    {
        var testSession = await _context.TestSessions
            .Include(ts => ts.Questions)
            .FirstOrDefaultAsync(ts => ts.Id == testSessionId);

        if (testSession == null)
            throw new ArgumentException("Test session not found");

        // Calculate percentage of correct answers
        var totalQuestions = testSession.Questions.Count;
        var correctAnswers = testSession.Questions
            .Count(sq => sq.UserAnswer == sq.CorrectAnswer);

        var percentage = totalQuestions > 0 ? (correctAnswers * 100) / totalQuestions : 0;

        // Determine adaptive level based on thresholds
        if (percentage >= config.MediumToHighThreshold)
            return AdaptiveLevel.High;
        else if (percentage >= config.LowToMediumThreshold)
            return AdaptiveLevel.Medium;
        else
            return AdaptiveLevel.Low;
    }

    public async Task<List<Question>> GetAdaptiveQuestionsAsync(AdaptiveLevel level, string subject, int count)
    {
        var difficultyLevel = level switch
        {
            AdaptiveLevel.Low => DifficultyLevel.Easy,
            AdaptiveLevel.Medium => DifficultyLevel.Medium,
            AdaptiveLevel.High => DifficultyLevel.Hard,
            _ => DifficultyLevel.Medium
        };

        var questions = await _context.Questions
            .Where(q => q.Difficulty == difficultyLevel && 
                       q.Subject == subject && 
                       q.TestType == TestType.Adaptive)
            .OrderBy(q => Guid.NewGuid()) // Random ordering
            .Take(count)
            .ToListAsync();

        return questions;
    }

    public async Task<TestAttemptResult> CalculateFinalScoreAsync(Guid testAttemptId)
    {
        var testAttempt = await _context.TestAttempts
            .Include(ta => ta.BaseTestSession)
                .ThenInclude(ts => ts.Questions)
            .Include(ta => ta.Adaptive1Session)
                .ThenInclude(ts => ts.Questions)
            .Include(ta => ta.Adaptive2Session)
                .ThenInclude(ts => ts.Questions)
            .Include(ta => ta.AdaptiveConfig)
            .FirstOrDefaultAsync(ta => ta.Id == testAttemptId);

        if (testAttempt == null)
            throw new ArgumentException("Test attempt not found");

        var config = testAttempt.AdaptiveConfig;

        // Calculate base test score
        var baseScore = CalculateSessionScore(testAttempt.BaseTestSession);
        
        // Calculate adaptive scores
        var adaptive1Score = testAttempt.Adaptive1Session != null ? 
            CalculateSessionScore(testAttempt.Adaptive1Session) : 0;
        var adaptive2Score = testAttempt.Adaptive2Session != null ? 
            CalculateSessionScore(testAttempt.Adaptive2Session) : 0;

        // Calculate weighted final score
        var adaptiveAverage = (adaptive1Score + adaptive2Score) / 2;
        var finalScore = (baseScore * config.BaseTestWeight / 100) + 
                        (adaptiveAverage * config.AdaptiveTestWeight / 100);

        // Update test attempt with scores
        testAttempt.BaseTestScore = (int?)baseScore;
        testAttempt.Adaptive1Score = (int?)adaptive1Score;
        testAttempt.Adaptive2Score = (int?)adaptive2Score;
        testAttempt.FinalScore = finalScore;
        testAttempt.CompletedAt = DateTime.UtcNow;
        testAttempt.Status = TestAttemptStatus.Completed;

        await _context.SaveChangesAsync();

        return new TestAttemptResult
        {
            TestAttemptId = testAttemptId,
            BaseScore = baseScore,
            Adaptive1Score = adaptive1Score,
            Adaptive2Score = adaptive2Score,
            FinalScore = finalScore,
            AdaptiveLevel = testAttempt.CurrentLevel,
            CompletedAt = testAttempt.CompletedAt.Value,
            TotalTimeSpent = testAttempt.TotalTimeSpent ?? 0
        };
    }

    public async Task<bool> CanUserRetakeTestAsync(Guid userId)
    {
        var config = await GetActiveConfigAsync();
        if (config == null) return false;

        var recentAttempts = await _context.TestAttempts
            .Where(ta => ta.UserId == userId && 
                        ta.Status == TestAttemptStatus.Completed &&
                        ta.CompletedAt >= DateTime.UtcNow.AddHours(-config.RetakeCooldownHours))
            .CountAsync();

        var totalAttempts = await _context.TestAttempts
            .Where(ta => ta.UserId == userId && ta.Status == TestAttemptStatus.Completed)
            .CountAsync();

        return totalAttempts < config.MaxRetakeAttempts && recentAttempts == 0;
    }

    public async Task<List<string>> GenerateStudyRecommendationsAsync(Guid testAttemptId)
    {
        var testAttempt = await _context.TestAttempts
            .Include(ta => ta.BaseTestSession)
                .ThenInclude(ts => ts.Questions)
            .Include(ta => ta.Adaptive1Session)
                .ThenInclude(ts => ts.Questions)
            .Include(ta => ta.Adaptive2Session)
                .ThenInclude(ts => ts.Questions)
            .FirstOrDefaultAsync(ta => ta.Id == testAttemptId);

        if (testAttempt == null)
            return new List<string>();

        var recommendations = new List<string>();
        var weakAreas = new Dictionary<string, int>();

        // Analyze incorrect answers across all sessions
        var allSessions = new[] { testAttempt.BaseTestSession, testAttempt.Adaptive1Session, testAttempt.Adaptive2Session }
            .Where(s => s != null);

        foreach (var session in allSessions)
        {
            var incorrectQuestions = session.Questions
                .Where(sq => sq.UserAnswer != sq.CorrectAnswer);

            foreach (var question in incorrectQuestions)
            {
                if (!weakAreas.ContainsKey(question.Subject))
                    weakAreas[question.Subject] = 0;
                weakAreas[question.Subject]++;
            }
        }

        // Generate recommendations based on weak areas
        foreach (var area in weakAreas.OrderByDescending(wa => wa.Value).Take(3))
        {
            recommendations.Add($"Focus on {area.Key} - {area.Value} incorrect answers");
            recommendations.Add($"Review {area.Key} fundamentals and practice problems");
        }

        // Add general recommendations based on final score
        if (testAttempt.FinalScore < 60)
        {
            recommendations.Add("Consider reviewing basic concepts before retaking");
            recommendations.Add("Practice with easier difficulty questions first");
        }
        else if (testAttempt.FinalScore < 80)
        {
            recommendations.Add("Focus on medium difficulty practice problems");
            recommendations.Add("Review time management strategies");
        }
        else
        {
            recommendations.Add("Practice advanced problems to maintain proficiency");
            recommendations.Add("Consider helping others to reinforce your knowledge");
        }

        return recommendations;
    }

    private async Task<int> GetNextAttemptNumberAsync(Guid userId)
    {
        var lastAttempt = await _context.TestAttempts
            .Where(ta => ta.UserId == userId)
            .OrderByDescending(ta => ta.AttemptNumber)
            .FirstOrDefaultAsync();

        return (lastAttempt?.AttemptNumber ?? 0) + 1;
    }

    private double CalculateSessionScore(TestSession? session)
    {
        if (session?.Questions == null || !session.Questions.Any())
            return 0;

        var totalQuestions = session.Questions.Count;
        var correctAnswers = session.Questions
            .Count(sq => sq.UserAnswer == sq.CorrectAnswer);

        return (double)correctAnswers / totalQuestions * 100;
    }
}

public class TestAttemptResult
{
    public Guid TestAttemptId { get; set; }
    public double BaseScore { get; set; }
    public double Adaptive1Score { get; set; }
    public double Adaptive2Score { get; set; }
    public double FinalScore { get; set; }
    public AdaptiveLevel AdaptiveLevel { get; set; }
    public DateTime CompletedAt { get; set; }
    public int TotalTimeSpent { get; set; }
}