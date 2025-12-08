using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PracticeController : ControllerBase
{
    private readonly AppDbContext _context;
    private static readonly string[] AllowedSubjects = new[] { "Math", "Reading and Writing" };

    public PracticeController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get available filters and counts for a subject
    /// </summary>
    [HttpGet("options")]
    public async Task<IActionResult> GetPracticeOptions([FromQuery] string? subject = null)
    {
        try
        {
            var userId = GetUserId();
            
            // Get base query for questions (restrict to allowed subjects)
            var questionsQuery = _context.Questions.Where(q => q.IsActive && AllowedSubjects.Contains(q.Subject));
            
            if (!string.IsNullOrEmpty(subject))
            {
                var normalized = NormalizeSubject(subject);
                if (normalized == null)
                {
                    return BadRequest(new { success = false, message = "Unsupported subject" });
                }
                questionsQuery = questionsQuery.Where(q => q.Subject == normalized);
            }

            var questions = await questionsQuery.ToListAsync();
            
            // Get user's question stats for filtering
            var userStats = await _context.UserQuestionStats
                .Where(s => s.UserId == userId)
                .ToListAsync();

            var userStatsDict = userStats.ToDictionary(s => s.QuestionId, s => s);

            // Calculate counts for different statuses
            var unusedCount = 0;
            var incorrectCount = 0;
            var correctCount = 0;
            var masteredCount = 0;
            var flaggedCount = 0; // Added: flagged (marked) questions count

            foreach (var question in questions)
            {
                if (userStatsDict.TryGetValue(question.Id, out var stats))
                {
                    if (stats.MasteryLevel == QuestionMasteryLevel.Mastered)
                        masteredCount++;
                    else if (stats.CorrectAttempts > 0 && stats.TotalAttempts == stats.CorrectAttempts)
                        correctCount++;
                    else if (stats.TotalAttempts > stats.CorrectAttempts)
                        incorrectCount++;
                    else
                        unusedCount++;

                    // Added: count flagged (marked for review)
                    if (stats.IsMarkedForReview)
                        flaggedCount++;
                }
                else
                {
                    unusedCount++;
                }
            }

            // Get available subjects (restricted to allowed)
            var subjects = await _context.Questions
                .Where(q => q.IsActive && AllowedSubjects.Contains(q.Subject))
                .Select(q => q.Subject)
                .Distinct()
                .ToListAsync();

            // Get difficulty distribution
            var difficultyDistribution = questions
                .GroupBy(q => q.Difficulty)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            // Get domains/topics (using Tags as domains for now)
            var domains = questions
                .Where(q => !string.IsNullOrEmpty(q.Tags))
                .SelectMany(q => JsonSerializer.Deserialize<List<string>>(q.Tags) ?? new List<string>())
                .Distinct()
                .ToList();

            return Ok(new
            {
                success = true,
                data = new
                {
                    subjects,
                    statusCounts = new
                    {
                        unused = unusedCount,
                        incorrect = incorrectCount,
                        correct = correctCount,
                        mastered = masteredCount,
                        flagged = flaggedCount // Added: flagged count in options
                    },
                    difficultyDistribution,
                    domains,
                    totalQuestions = questions.Count
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error getting practice options: {ex.Message}" });
        }
    }

    /// <summary>
    /// Start a new practice session
    /// </summary>
    [HttpPost("start")]
    public async Task<IActionResult> StartPracticeSession([FromBody] StartPracticeSessionDto dto)
    {
        try
        {
            var userId = GetUserId();
            
            // Build question query based on filters (restrict to allowed subjects)
            var questionsQuery = _context.Questions.Where(q => q.IsActive && AllowedSubjects.Contains(q.Subject));
            
            string? normalizedSubject = NormalizeSubject(dto.Subject);
            if (!string.IsNullOrEmpty(dto.Subject) && normalizedSubject == null)
            {
                return BadRequest(new { success = false, message = "Unsupported subject" });
            }
            
            if (normalizedSubject != null)
            {
                questionsQuery = questionsQuery.Where(q => q.Subject == normalizedSubject);
            }
            
            if (dto.Difficulty.HasValue)
            {
                questionsQuery = questionsQuery.Where(q => q.Difficulty == dto.Difficulty.Value);
            }
            
            if (dto.Domains?.Any() == true)
            {
                questionsQuery = questionsQuery.Where(q => 
                    !string.IsNullOrEmpty(q.Tags) && 
                    dto.Domains.Any(domain => q.Tags.Contains(domain)));
            }

            // Apply status filter based on user's question stats
            var userStats = await _context.UserQuestionStats
                .Where(s => s.UserId == userId)
                .ToListAsync();
            
            var userStatsDict = userStats.ToDictionary(s => s.QuestionId, s => s);
            var allQuestions = await questionsQuery.ToListAsync();
            
            var filteredQuestions = new List<Question>();
            
            foreach (var question in allQuestions)
            {
                var shouldInclude = false;
                
                if (userStatsDict.TryGetValue(question.Id, out var stats))
                {
                    switch (dto.Status?.ToLower())
                    {
                        case "unused":
                            shouldInclude = stats.TotalAttempts == 0;
                            break;
                        case "incorrect":
                            shouldInclude = stats.TotalAttempts > stats.CorrectAttempts;
                            break;
                        case "correct":
                            shouldInclude = stats.CorrectAttempts > 0 && stats.TotalAttempts == stats.CorrectAttempts && stats.MasteryLevel != QuestionMasteryLevel.Mastered;
                            break;
                        case "mastered":
                            shouldInclude = stats.MasteryLevel == QuestionMasteryLevel.Mastered;
                            break;
                        case "flagged":
                        case "marked":
                            // Added: include only questions the user marked/flagged for review
                            shouldInclude = stats.IsMarkedForReview;
                            break;
                        default:
                            shouldInclude = true;
                            break;
                    }
                }
                else
                {
                    // Question never attempted
                    shouldInclude = dto.Status?.ToLower() != "correct" && dto.Status?.ToLower() != "mastered" && dto.Status?.ToLower() != "incorrect" && dto.Status?.ToLower() != "flagged" && dto.Status?.ToLower() != "marked";
                }
                
                if (shouldInclude)
                {
                    filteredQuestions.Add(question);
                }
            }
            
            // Shuffle and take requested number of questions
            var random = new Random();
            var selectedQuestions = filteredQuestions
                .OrderBy(q => random.Next())
                .Take(dto.QuestionCount)
                .ToList();
            
            if (!selectedQuestions.Any())
            {
                return BadRequest(new { success = false, message = "No questions available with the specified filters" });
            }
            
            // Create practice session
            var practiceSession = new PracticeSession
            {
                UserId = userId,
                Subject = normalizedSubject ?? "Mixed",
                Mode = dto.Mode,
                Difficulty = dto.Difficulty ?? DifficultyLevel.Easy,
                Status = PracticeStatus.InProgress,
                TotalQuestions = selectedQuestions.Count,
                StartedAt = DateTime.UtcNow,
                TimeLimit = null
            };
            
            _context.PracticeSessions.Add(practiceSession);
            await _context.SaveChangesAsync();
            
            // Create practice answers for each question
            var practiceAnswers = selectedQuestions.Select((q, index) => new PracticeAnswer
            {
                PracticeSessionId = practiceSession.Id,
                QuestionId = q.Id,
                QuestionOrder = index + 1
            }).ToList();
            
            _context.PracticeAnswers.AddRange(practiceAnswers);
            await _context.SaveChangesAsync();
            
            // Return session info with first question
            var firstQuestion = selectedQuestions.First();
            var firstQuestionOptions = ParseOptions(firstQuestion.Options);
            
            return Ok(new
            {
                success = true,
                sessionId = practiceSession.Id,
                totalQuestions = practiceSession.TotalQuestions,
                currentQuestion = 1,
                question = new
                {
                    id = firstQuestion.Id,
                    content = firstQuestion.Content,
                    options = firstQuestionOptions,
                    difficulty = firstQuestion.Difficulty.ToString(),
                    subject = firstQuestion.Subject,
                    points = firstQuestion.Points
                },
                mode = dto.Mode.ToString()
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error starting practice session: {ex.Message}" });
        }
    }

    /// <summary>
    /// Save an answer for a question in the current practice session
    /// </summary>
    [HttpPost("answer")]
    public async Task<IActionResult> SaveAnswer([FromBody] SaveAnswerDto dto)
    {
        try
        {
            var userId = GetUserId();
            
            // Verify session belongs to user and is active
            var session = await _context.PracticeSessions
                .FirstOrDefaultAsync(s => s.Id == dto.SessionId && s.UserId == userId && s.Status == PracticeStatus.InProgress);
            
            if (session == null)
            {
                return NotFound(new { success = false, message = "Practice session not found or not active" });
            }
            
            // Find the practice answer record
            var practiceAnswer = await _context.PracticeAnswers
                .Include(pa => pa.Question)
                .FirstOrDefaultAsync(pa => pa.PracticeSessionId == dto.SessionId && pa.QuestionId == dto.QuestionId);
            
            if (practiceAnswer == null)
            {
                return NotFound(new { success = false, message = "Question not found in this practice session" });
            }
            
            // Update the answer
            var isCorrect = practiceAnswer.Question.CorrectAnswer?.Trim().Equals(dto.UserAnswer?.Trim(), StringComparison.OrdinalIgnoreCase) == true;
            
            practiceAnswer.UserAnswer = dto.UserAnswer;
            practiceAnswer.IsCorrect = isCorrect;
            practiceAnswer.TimeSpent = dto.TimeSpent;
            practiceAnswer.AnsweredAt = DateTime.UtcNow;
            practiceAnswer.ConfidenceLevel = dto.ConfidenceLevel;
            
            if (dto.AnswerChanges.HasValue)
                practiceAnswer.AnswerChanges = dto.AnswerChanges.Value;
            
            await _context.SaveChangesAsync();
            
            // Update user question stats
            await UpdateUserQuestionStats(userId, dto.QuestionId, isCorrect, dto.TimeSpent);
            
            // Get next question if available
            var nextQuestion = await GetNextQuestion(dto.SessionId, practiceAnswer.QuestionOrder);
            
            var response = new
            {
                success = true,
                isCorrect,
                correctAnswer = practiceAnswer.Question.CorrectAnswer,
                explanation = session.Mode == PracticeMode.Tutor ? practiceAnswer.Question.Explanation : null,
                nextQuestion = nextQuestion
            };
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error saving answer: {ex.Message}" });
        }
    }

    /// <summary>
    /// Submit and complete a practice session
    /// </summary>
    [HttpPost("submit")]
    public async Task<IActionResult> SubmitSession([FromBody] SubmitSessionDto dto)
    {
        try
        {
            var userId = GetUserId();
            
            var session = await _context.PracticeSessions
                .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
                .FirstOrDefaultAsync(s => s.Id == dto.SessionId && s.UserId == userId);
            
            if (session == null)
            {
                return NotFound(new { success = false, message = "Practice session not found" });
            }
            
            // Calculate session results
            var answeredQuestions = session.Answers.Where(a => !string.IsNullOrEmpty(a.UserAnswer)).ToList();
            var correctAnswers = answeredQuestions.Count(a => a.IsCorrect == true);
            var totalTimeSpent = answeredQuestions.Sum(a => a.TimeSpent);
            
            // Update session
            session.Status = PracticeStatus.Completed;
            session.CompletedAt = DateTime.UtcNow;
            session.CorrectAnswers = correctAnswers;
            session.TotalTimeSpent = totalTimeSpent;
            session.Score = session.TotalQuestions > 0 ? (int)Math.Round((double)correctAnswers / session.TotalQuestions * 100) : 0;
            
            await _context.SaveChangesAsync();
            
            return Ok(new
            {
                success = true,
                results = new
                {
                    sessionId = session.Id,
                    totalQuestions = session.TotalQuestions,
                    answeredQuestions = answeredQuestions.Count,
                    correctAnswers,
                    score = session.Score,
                    totalTimeSpent,
                    averageTimePerQuestion = answeredQuestions.Count > 0 ? totalTimeSpent / answeredQuestions.Count : 0
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error submitting session: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get user's practice history
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetPracticeHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? subject = null)
    {
        try
        {
            var userId = GetUserId();
            
            var query = _context.PracticeSessions
                .Where(s => s.UserId == userId);
            
            if (!string.IsNullOrEmpty(subject))
            {
                query = query.Where(s => s.Subject == subject);
            }
            
            var totalCount = await query.CountAsync();
            
            var sessions = await query
                .OrderByDescending(s => s.StartedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    s.Id,
                    s.Subject,
                    Mode = s.Mode.ToString(),
                    Status = s.Status.ToString(),
                    s.TotalQuestions,
                    s.CorrectAnswers,
                    s.Score,
                    s.TotalTimeSpent,
                    s.StartedAt,
                    s.CompletedAt
                })
                .ToListAsync();
            
            return Ok(new
            {
                success = true,
                data = sessions,
                pagination = new
                {
                    page,
                    pageSize,
                    totalCount,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error getting practice history: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get user's performance data and analytics
    /// </summary>
    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformanceData([FromQuery] string? subject = null)
    {
        try
        {
            var userId = GetUserId();
            
            var sessionsQuery = _context.PracticeSessions
                .Where(s => s.UserId == userId && s.Status == PracticeStatus.Completed);
            
            if (!string.IsNullOrEmpty(subject))
            {
                sessionsQuery = sessionsQuery.Where(s => s.Subject == subject);
            }
            
            var sessions = await sessionsQuery.ToListAsync();
            
            // Overall stats
            var totalSessions = sessions.Count;
            var totalQuestions = sessions.Sum(s => s.TotalQuestions);
            var totalCorrect = sessions.Sum(s => s.CorrectAnswers);
            var averageScore = sessions.Any() ? sessions.Average(s => s.Score) : 0;
            var totalTimeSpent = sessions.Sum(s => s.TotalTimeSpent);
            
            // Score trends (last 10 sessions)
            var recentSessions = sessions
                .OrderByDescending(s => s.CompletedAt)
                .Take(10)
                .OrderBy(s => s.CompletedAt)
                .Select(s => new
                {
                    date = s.CompletedAt?.ToString("yyyy-MM-dd"),
                    score = s.Score
                })
                .ToList();
            
            // Performance by difficulty
            var userStats = await _context.UserQuestionStats
                .Include(s => s.Question)
                .Where(s => s.UserId == userId)
                .ToListAsync();
            
            var difficultyPerformance = userStats
                .Where(s => string.IsNullOrEmpty(subject) || s.Question.Subject == subject)
                .GroupBy(s => s.Question.Difficulty)
                .Select(g => new
                {
                    difficulty = g.Key.ToString(),
                    accuracy = g.Sum(s => s.CorrectAttempts) / (double)Math.Max(1, g.Sum(s => s.TotalAttempts)) * 100,
                    totalAttempts = g.Sum(s => s.TotalAttempts)
                })
                .ToList();
            
            // Performance by domain/topic (using tags)
            var domainPerformance = userStats
                .Where(s => string.IsNullOrEmpty(subject) || s.Question.Subject == subject)
                .Where(s => !string.IsNullOrEmpty(s.Question.Tags))
                .SelectMany(s => JsonSerializer.Deserialize<List<string>>(s.Question.Tags) ?? new List<string>(),
                    (s, tag) => new { tag, stats = s })
                .GroupBy(x => x.tag)
                .Select(g => new
                {
                    domain = g.Key,
                    accuracy = g.Sum(x => x.stats.CorrectAttempts) / (double)Math.Max(1, g.Sum(x => x.stats.TotalAttempts)) * 100,
                    totalAttempts = g.Sum(x => x.stats.TotalAttempts)
                })
                .Where(x => x.totalAttempts > 0)
                .OrderByDescending(x => x.totalAttempts)
                .Take(10)
                .ToList();
            
            return Ok(new
            {
                success = true,
                data = new
                {
                    overall = new
                    {
                        totalSessions,
                        totalQuestions,
                        totalCorrect,
                        overallAccuracy = totalQuestions > 0 ? (double)totalCorrect / totalQuestions * 100 : 0,
                        averageScore,
                        totalTimeSpent,
                        averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0
                    },
                    scoresTrend = recentSessions,
                    difficultyPerformance,
                    domainPerformance
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error getting performance data: {ex.Message}" });
        }
    }

    /// <summary>
    /// Review a completed practice session
    /// </summary>
    [HttpGet("session/{sessionId}")]
    public async Task<IActionResult> ReviewSession(Guid sessionId)
    {
        try
        {
            var userId = GetUserId();
            
            var session = await _context.PracticeSessions
                .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
            
            if (session == null)
            {
                return NotFound(new { success = false, message = "Practice session not found" });
            }
            
            var questions = session.Answers
                .OrderBy(a => a.QuestionOrder)
                .Select(a => new
                {
                    questionId = a.QuestionId,
                    content = a.Question.Content,
                    options = string.IsNullOrEmpty(a.Question.Options) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(a.Question.Options) ?? new List<string>(),
                    userAnswer = a.UserAnswer,
                    correctAnswer = a.Question.CorrectAnswer,
                    isCorrect = a.IsCorrect,
                    explanation = a.Question.Explanation,
                    timeSpent = a.TimeSpent,
                    difficulty = a.Question.Difficulty.ToString(),
                    subject = a.Question.Subject,
                    isBookmarked = a.IsBookmarked,
                    userNotes = a.UserNotes
                })
                .ToList();
            
            return Ok(new
            {
                success = true,
                session = new
                {
                    id = session.Id,
                    subject = session.Subject,
                    mode = session.Mode.ToString(),
                    status = session.Status.ToString(),
                    totalQuestions = session.TotalQuestions,
                    correctAnswers = session.CorrectAnswers,
                    score = session.Score,
                    totalTimeSpent = session.TotalTimeSpent,
                    startedAt = session.StartedAt,
                    completedAt = session.CompletedAt
                },
                questions
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error reviewing session: {ex.Message}" });
        }
    }

    /// <summary>
    /// Save or update user practice preferences
    /// </summary>
    [HttpPost("preferences")]
    public async Task<IActionResult> SavePreferences([FromBody] SavePreferencesDto dto)
    {
        try
        {
            var userId = GetUserId();
            
            var preferences = await _context.UserPracticePreferences
                .FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (preferences == null)
            {
                preferences = new UserPracticePreferences
                {
                    UserId = userId
                };
                _context.UserPracticePreferences.Add(preferences);
            }
            
            preferences.PreferredSubject = dto.PreferredSubject;
            preferences.PreferredDifficulty = dto.PreferredDifficulty;
            preferences.PreferredMode = dto.PreferredMode;
            preferences.PreferredQuestionCount = dto.PreferredQuestionCount;
            preferences.PreferredDomains = dto.PreferredDomains?.Any() == true 
                ? JsonSerializer.Serialize(dto.PreferredDomains) 
                : null;
            preferences.PreferredStatus = dto.PreferredStatus;
            preferences.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return Ok(new { success = true, message = "Preferences saved successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error saving preferences: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get user practice preferences
    /// </summary>
    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        try
        {
            var userId = GetUserId();
            
            var preferences = await _context.UserPracticePreferences
                .FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (preferences == null)
            {
                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        preferredSubject = (string?)null,
                        preferredDifficulty = (string?)null,
                        preferredMode = "Mock",
                        preferredQuestionCount = 10,
                        preferredDomains = new List<string>(),
                        preferredStatus = (string?)null
                    }
                });
            }
            
            return Ok(new
            {
                success = true,
                data = new
                {
                    preferredSubject = preferences.PreferredSubject,
                    preferredDifficulty = preferences.PreferredDifficulty?.ToString(),
                    preferredMode = preferences.PreferredMode.ToString(),
                    preferredQuestionCount = preferences.PreferredQuestionCount,
                    preferredDomains = string.IsNullOrEmpty(preferences.PreferredDomains) 
                        ? new List<string>() 
                        : JsonSerializer.Deserialize<List<string>>(preferences.PreferredDomains) ?? new List<string>(),
                    preferredStatus = preferences.PreferredStatus
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error getting preferences: {ex.Message}" });
        }
    }

    // Helper methods
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
        {
            throw new UnauthorizedAccessException("Invalid user ID");
        }
        return userId;
    }

    private async Task UpdateUserQuestionStats(Guid userId, Guid questionId, bool isCorrect, int timeSpent)
    {
        var stats = await _context.UserQuestionStats
            .FirstOrDefaultAsync(s => s.UserId == userId && s.QuestionId == questionId);
        
        if (stats == null)
        {
            stats = new UserQuestionStats
            {
                UserId = userId,
                QuestionId = questionId,
                TotalAttempts = 1,
                CorrectAttempts = isCorrect ? 1 : 0,
                TotalTimeSpent = timeSpent,
                AverageTimePerAttempt = timeSpent,
                FirstAttemptAt = DateTime.UtcNow,
                LastAttemptAt = DateTime.UtcNow
            };
            _context.UserQuestionStats.Add(stats);
        }
        else
        {
            stats.TotalAttempts++;
            if (isCorrect) stats.CorrectAttempts++;
            stats.TotalTimeSpent += timeSpent;
            stats.AverageTimePerAttempt = stats.TotalTimeSpent / stats.TotalAttempts;
            stats.LastAttemptAt = DateTime.UtcNow;
        }
        
        // Update accuracy and mastery level
        stats.AccuracyRate = (double)stats.CorrectAttempts / stats.TotalAttempts * 100;
        
        if (stats.AccuracyRate >= 90 && stats.TotalAttempts >= 3)
            stats.MasteryLevel = QuestionMasteryLevel.Mastered;
        else if (stats.AccuracyRate >= 70)
            stats.MasteryLevel = QuestionMasteryLevel.Proficient;
        else if (stats.AccuracyRate >= 50)
            stats.MasteryLevel = QuestionMasteryLevel.Learning;
        else
            stats.MasteryLevel = QuestionMasteryLevel.Struggling;
        
        await _context.SaveChangesAsync();
    }

    private async Task<object?> GetNextQuestion(Guid sessionId, int currentQuestionOrder)
    {
        var nextAnswer = await _context.PracticeAnswers
            .Include(pa => pa.Question)
            .FirstOrDefaultAsync(pa => pa.PracticeSessionId == sessionId && pa.QuestionOrder == currentQuestionOrder + 1);
        
        if (nextAnswer == null) return null;
        
        var options = ParseOptions(nextAnswer.Question.Options);
        
        return new
        {
            id = nextAnswer.Question.Id,
            content = nextAnswer.Question.Content,
            options,
            difficulty = nextAnswer.Question.Difficulty.ToString(),
            subject = nextAnswer.Question.Subject,
            points = nextAnswer.Question.Points,
            questionNumber = nextAnswer.QuestionOrder
        };
    }

    private static List<string> ParseOptions(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
        var s = raw.Trim();
        if (s.StartsWith("["))
        {
            try
            {
                return JsonSerializer.Deserialize<List<string>>(s) ?? new List<string>();
            }
            catch
            {
                // Fall back to CSV handling below
            }
        }
        // Fallback: treat as comma-separated options like "A) 1,B) 2,C) 3"
        return s
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Where(x => x.Length > 0)
            .ToList();
    }

    private static string? NormalizeSubject(string? subject)
    {
        if (string.IsNullOrWhiteSpace(subject)) return null;
        var s = subject.Trim();
        if (s.Equals("Math", StringComparison.OrdinalIgnoreCase)) return "Math";
        if (s.Equals("Reading and Writing", StringComparison.OrdinalIgnoreCase)) return "Reading and Writing";
        if (s.Equals("Reading & Writing", StringComparison.OrdinalIgnoreCase)) return "Reading and Writing";
        return null;
    }
}

// DTOs
public class StartPracticeSessionDto
{
    public string? Subject { get; set; }
    public DifficultyLevel? Difficulty { get; set; }
    public List<string>? Domains { get; set; }
    public string? Status { get; set; } // unused, incorrect, correct, mastered
    public int QuestionCount { get; set; } = 10;
    public PracticeMode Mode { get; set; } = PracticeMode.Mock;
}

public class SaveAnswerDto
{
    public Guid SessionId { get; set; }
    public Guid QuestionId { get; set; }
    public string? UserAnswer { get; set; }
    public int TimeSpent { get; set; }
    public int? ConfidenceLevel { get; set; }
    public int? AnswerChanges { get; set; }
}

public class SubmitSessionDto
{
    public Guid SessionId { get; set; }
}

public class SavePreferencesDto
{
    public string? PreferredSubject { get; set; }
    public DifficultyLevel? PreferredDifficulty { get; set; }
    public PracticeMode PreferredMode { get; set; } = PracticeMode.Mock;
    public int PreferredQuestionCount { get; set; } = 10;
    public List<string>? PreferredDomains { get; set; }
    public string? PreferredStatus { get; set; }
}

public class AddNotesDto
{
    public Guid SessionId { get; set; }
    public Guid QuestionId { get; set; }
    public string Notes { get; set; } = string.Empty;
}