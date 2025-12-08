using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/student/questions")]
[Authorize]
public class StudentQuestionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<StudentQuestionsController> _logger;

    public StudentQuestionsController(AppDbContext context, ILogger<StudentQuestionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestions(
        [FromQuery] string? subject = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var query = _context.Questions.Where(q => q.IsActive);
            
            // Filter by subject if specified
            if (!string.IsNullOrEmpty(subject))
            {
                query = query.Where(q => q.Subject.Contains(subject));
            }
            
            // Filter by difficulty if specified
            if (!string.IsNullOrEmpty(difficulty))
            {
                if (Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
                {
                    query = query.Where(q => q.Difficulty == difficultyLevel);
                }
            }
            
            var questionData = await query
                .OrderBy(q => Guid.NewGuid()) // Random order
                .Take(limit)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString(),
                    timeLimit = 90
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType,
                timeLimit = q.timeLimit
            }).ToList();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving questions");
            return StatusCode(500, new { success = false, message = "Error retrieving questions" });
        }
    }

    [HttpGet("by-module/{moduleRoute}")]
    public async Task<IActionResult> GetQuestionsByModule(string moduleRoute, [FromQuery] int count = 20)
    {
        try
        {
            var questionData = await _context.Questions
                .Where(q => q.IsActive && q.Subject.ToLower().Contains(moduleRoute.ToLower()))
                .OrderBy(q => Guid.NewGuid()) // Random order
                .Take(count)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString(),
                    timeLimit = 90 // Default time limit in seconds
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType,
                timeLimit = q.timeLimit
            }).ToList();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving questions by module: {ModuleRoute}", moduleRoute);
            return StatusCode(500, new { success = false, message = "Error retrieving questions" });
        }
    }

    [HttpGet("module")]
    public async Task<IActionResult> GetQuestionsByModule(
        [FromQuery] string moduleType,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? subject = null,
        [FromQuery] int limit = 50)
    {
        try
        {
            var query = _context.Questions.Where(q => q.IsActive);
            
            // Filter by difficulty if specified
            if (!string.IsNullOrEmpty(difficulty))
            {
                if (Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
                {
                    query = query.Where(q => q.Difficulty == difficultyLevel);
                }
            }
            
            // Filter by subject if specified
            if (!string.IsNullOrEmpty(subject))
            {
                query = query.Where(q => q.Subject.Contains(subject));
            }
            
            // Filter by module type (base vs adaptive)
            if (moduleType.ToLower().Contains("adaptive"))
            {
                query = query.Where(q => q.TestType == TestType.Adaptive);
            }
            else if (moduleType.ToLower().Contains("base"))
            {
                query = query.Where(q => q.TestType == TestType.Base);
            }
            
            var questionData = await query
                .OrderBy(q => Guid.NewGuid()) // Random order
                .Take(limit)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString(),
                    timeLimit = 90 // Default time limit in seconds
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType,
                timeLimit = q.timeLimit
            }).ToList();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving questions by module: {ModuleType}", moduleType);
            return StatusCode(500, new { success = false, message = "Error retrieving questions" });
        }
    }

    [HttpGet("{questionId}")]
    public async Task<IActionResult> GetQuestionById(Guid questionId)
    {
        try
        {
            var questionData = await _context.Questions
                .Where(q => q.Id == questionId && q.IsActive)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString(),
                    explanation = q.Explanation
                })
                .FirstOrDefaultAsync();

            if (questionData == null)
                return NotFound(new { success = false, message = "Question not found" });

            var question = new
            {
                id = questionData.id,
                questionText = questionData.questionText,
                options = !string.IsNullOrEmpty(questionData.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(questionData.optionsJson) : 
                    new List<object>(),
                subject = questionData.subject,
                difficulty = questionData.difficulty,
                testType = questionData.testType,
                explanation = questionData.explanation
            };



            return Ok(new { success = true, data = question });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error retrieving question" });
        }
    }

    [HttpGet("subject")]
    public async Task<IActionResult> GetQuestionsBySubject(
        [FromQuery] string subject,
        [FromQuery] string? difficulty = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var query = _context.Questions.Where(q => q.IsActive && q.Subject.Contains(subject));
            
            // Filter by difficulty if specified
            if (!string.IsNullOrEmpty(difficulty))
            {
                if (Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
                {
                    query = query.Where(q => q.Difficulty == difficultyLevel);
                }
            }
            
            var questionData = await query
                .OrderBy(q => Guid.NewGuid()) // Random order
                .Take(limit)
                .Select(q => new
                {
                    q.Id,
                    q.Title,
                    q.QuestionParagraph,
                    Content = q.Content,
                    q.Subject,
                    Difficulty = q.Difficulty.ToString(),
                    TestType = q.TestType.ToString(),
                    q.CorrectAnswer,
                    Options = q.Options ?? "[]",
                    Tags = q.Tags ?? "[]",
                    q.Points,
                    q.CreatedAt,
                    q.IsActive
                })
                .ToListAsync();

            var questions = new List<object>();
            foreach (var q in questionData)
            {
                List<object> optionsList;
                try
                {
                    optionsList = !string.IsNullOrWhiteSpace(q.Options)
                        ? System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.Options) ?? new List<object>()
                        : new List<object>();
                }
                catch
                {
                    optionsList = new List<object>();
                }

                List<object> tagsList;
                try
                {
                    tagsList = !string.IsNullOrWhiteSpace(q.Tags)
                        ? System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.Tags) ?? new List<object>()
                        : new List<object>();
                }
                catch
                {
                    tagsList = new List<object>();
                }

                questions.Add(new
                {
                    id = q.Id,
                    title = q.Title,
                    questionParagraph = q.QuestionParagraph,
                    content = q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty,
                    testType = q.TestType,
                    correctAnswer = q.CorrectAnswer,
                    options = optionsList,
                    tags = tagsList,
                    points = q.Points,
                    createdAt = q.CreatedAt,
                    isActive = q.IsActive
                });
            }

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving questions by subject: {Subject}", subject);
            return StatusCode(500, new { success = false, message = "Error retrieving questions" });
        }
    }

    [HttpPost("adaptive")]
    public async Task<IActionResult> GetAdaptiveQuestions([FromBody] AdaptiveQuestionsRequest request)
    {
        try
        {
            var query = _context.Questions.Where(q => q.IsActive && q.TestType == TestType.Adaptive);
            
            // Filter by subject if specified
            if (!string.IsNullOrEmpty(request.Subject))
            {
                query = query.Where(q => q.Subject.Contains(request.Subject));
            }
            
            // Exclude previously answered questions
            if (request.PreviousQuestions != null && request.PreviousQuestions.Any())
            {
                query = query.Where(q => !request.PreviousQuestions.Contains(q.Id));
            }
            
            // Select questions based on user ability (simplified adaptive logic)
            DifficultyLevel targetDifficulty;
            if (request.UserAbility >= 0.7)
                targetDifficulty = DifficultyLevel.Hard;
            else if (request.UserAbility >= 0.4)
                targetDifficulty = DifficultyLevel.Medium;
            else
                targetDifficulty = DifficultyLevel.Easy;
                
            query = query.Where(q => q.Difficulty == targetDifficulty);
            
            var questionData = await query
                .OrderBy(q => Guid.NewGuid())
                .Take(15) // Standard adaptive test size
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString(),
                    timeLimit = 90
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType,
                timeLimit = q.timeLimit
            }).ToList();

            return Ok(new { success = true, data = questions, targetDifficulty = targetDifficulty.ToString() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving adaptive questions");
            return StatusCode(500, new { success = false, message = "Error retrieving adaptive questions" });
        }
    }

    [HttpGet("by-subject/{subject}")]
    public async Task<IActionResult> GetQuestionsBySubjectLegacy(string subject, [FromQuery] int count = 20, [FromQuery] string difficulty = "")
    {
        try
        {
            var questionsQuery = _context.Questions
                .Where(q => q.IsActive && q.Subject.ToLower() == subject.ToLower());

            if (!string.IsNullOrEmpty(difficulty) && Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
            {
                questionsQuery = questionsQuery.Where(q => q.Difficulty == difficultyLevel);
            }

            var questionData = await questionsQuery
                .OrderBy(q => Guid.NewGuid())
                .Take(count)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString()
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType
            }).ToList();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving questions by subject: {Subject}", subject);
            return StatusCode(500, new { success = false, message = "Error retrieving questions" });
        }
    }

    [HttpGet("adaptive")]
    public async Task<IActionResult> GetAdaptiveQuestions([FromQuery] string subject, [FromQuery] double abilityLevel = 0.0, [FromQuery] int count = 10)
    {
        try
        {
            // Get user's recent performance to determine appropriate difficulty
            var userId = GetCurrentUserId();
            var recentSessions = await _context.TestSessions
                .Where(s => s.UserId == userId && s.EndTime.HasValue)
                .OrderByDescending(s => s.EndTime)
                .Take(3)
                .ToListAsync();

            var averageScore = recentSessions.Count > 0 ? recentSessions.Average(s => s.Score) : 50;
            
            // Determine difficulty based on performance
            var targetDifficulty = averageScore switch
            {
                >= 80 => DifficultyLevel.Hard,
                >= 60 => DifficultyLevel.Medium,
                _ => DifficultyLevel.Easy
            };

            var questionsQuery = _context.Questions
                .Where(q => q.IsActive);

            if (!string.IsNullOrEmpty(subject))
            {
                questionsQuery = questionsQuery.Where(q => q.Subject.ToLower() == subject.ToLower());
            }

            // Get a mix of difficulties centered around target
            var questions = new List<Question>();
            
            // 50% at target difficulty
            var targetQuestions = await questionsQuery
                .Where(q => q.Difficulty == targetDifficulty)
                .OrderBy(q => Guid.NewGuid())
                .Take(count / 2)
                .ToListAsync();
            questions.AddRange(targetQuestions);

            // 25% easier
            if (targetDifficulty > DifficultyLevel.Easy)
            {
                var easierQuestions = await questionsQuery
                    .Where(q => q.Difficulty == targetDifficulty - 1)
                    .OrderBy(q => Guid.NewGuid())
                    .Take(count / 4)
                    .ToListAsync();
                questions.AddRange(easierQuestions);
            }

            // 25% harder
            if (targetDifficulty < DifficultyLevel.Hard)
            {
                var harderQuestions = await questionsQuery
                    .Where(q => q.Difficulty == targetDifficulty + 1)
                    .OrderBy(q => Guid.NewGuid())
                    .Take(count / 4)
                    .ToListAsync();
                questions.AddRange(harderQuestions);
            }

            // Fill remaining slots if needed
            var remaining = count - questions.Count;
            if (remaining > 0)
            {
                var additionalQuestions = await questionsQuery
                    .Where(q => !questions.Select(qu => qu.Id).Contains(q.Id))
                    .OrderBy(q => Guid.NewGuid())
                    .Take(remaining)
                    .ToListAsync();
                questions.AddRange(additionalQuestions);
            }

            var result = questions.Select(q => new
            {
                id = q.Id,
                questionText = q.Content,
                optionsJson = q.Options,
                subject = q.Subject,
                difficulty = q.Difficulty.ToString(),
                testType = q.TestType.ToString()
            }).Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType
            }).ToList();

            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving adaptive questions");
            return StatusCode(500, new { success = false, message = "Error retrieving adaptive questions" });
        }
    }

    [HttpPost("submit-response")]
    public async Task<IActionResult> SubmitQuestionResponse([FromBody] QuestionResponseRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var question = await _context.Questions.FindAsync(request.QuestionId);
            
            if (question == null)
                return NotFound(new { success = false, message = "Question not found" });

            var isCorrect = question.CorrectAnswer.ToUpper() == request.UserAnswer.ToUpper();
            
            // Log the response (this could be stored in a separate table for analytics)
            _logger.LogInformation("User {UserId} answered question {QuestionId} with {Answer}, correct: {IsCorrect}", 
                userId, request.QuestionId, request.UserAnswer, isCorrect);

            var response = new
            {
                isCorrect = isCorrect,
                correctAnswer = question.CorrectAnswer,
                explanation = question.Explanation,
                userAnswer = request.UserAnswer,
                timeSpent = request.TimeSpent
            };

            return Ok(new { success = true, data = response });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting question response");
            return StatusCode(500, new { success = false, message = "Error submitting response" });
        }
    }

    [HttpGet("{questionId}/explanation")]
    public async Task<IActionResult> GetQuestionExplanation(Guid questionId)
    {
        try
        {
            var question = await _context.Questions
                .Where(q => q.Id == questionId && q.IsActive)
                .Select(q => new
                {
                    id = q.Id,
                    correctAnswer = q.CorrectAnswer,
                    explanation = q.Explanation,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString()
                })
                .FirstOrDefaultAsync();

            if (question == null)
                return NotFound(new { success = false, message = "Question not found" });

            return Ok(new { success = true, data = question });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question explanation: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error retrieving explanation" });
        }
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetQuestionStatistics([FromQuery] string subject = "", [FromQuery] string moduleRoute = "")
    {
        try
        {
            var questionsQuery = _context.Questions.Where(q => q.IsActive);

            if (!string.IsNullOrEmpty(subject))
                questionsQuery = questionsQuery.Where(q => q.Subject.ToLower() == subject.ToLower());

            // ModuleRoute filtering removed as property doesn't exist in Question model

            var statistics = await questionsQuery
                .GroupBy(q => q.Difficulty)
                .Select(g => new
                {
                    difficulty = g.Key.ToString(),
                    count = g.Count(),
                    subjects = g.GroupBy(q => q.Subject)
                        .Select(sg => new
                        {
                            subject = sg.Key,
                            count = sg.Count()
                        }).ToList()
                })
                .ToListAsync();

            var totalQuestions = await questionsQuery.CountAsync();
            var subjectBreakdown = await questionsQuery
                .GroupBy(q => q.Subject)
                .Select(g => new
                {
                    subject = g.Key,
                    count = g.Count(),
                    percentage = totalQuestions > 0 ? Math.Round((double)g.Count() / totalQuestions * 100, 1) : 0
                })
                .ToListAsync();

            var result = new
            {
                totalQuestions = totalQuestions,
                difficultyBreakdown = statistics,
                subjectBreakdown = subjectBreakdown
            };

            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question statistics");
            return StatusCode(500, new { success = false, message = "Error retrieving statistics" });
        }
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchQuestions([FromQuery] string query, [FromQuery] int limit = 20)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { success = false, message = "Search query is required" });

            var questions = await _context.Questions
                .Where(q => q.IsActive && 
                    (q.Content.Contains(query) || 
                     q.Subject.Contains(query) ||
                     (q.Explanation != null && q.Explanation.Contains(query))))
                .Take(limit)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content.Length > 100 ? q.Content.Substring(0, 100) + "..." : q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString()
                })
                .ToListAsync();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching questions with query: {Query}", query);
            return StatusCode(500, new { success = false, message = "Error searching questions" });
        }
    }

    [HttpGet("practice")]
    public async Task<IActionResult> GetPracticeQuestions([FromQuery] string subject = "", [FromQuery] string difficulty = "", [FromQuery] int count = 10)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Get questions user hasn't seen recently
            var recentSessionIds = await _context.TestSessions
                .Where(s => s.UserId == userId && s.StartTime >= DateTime.UtcNow.AddDays(-7))
                .Select(s => s.Id)
                .ToListAsync();

            // Note: SessionQuestion doesn't have QuestionId, so we'll get all active questions
            var questionsQuery = _context.Questions
                .Where(q => q.IsActive);

            if (!string.IsNullOrEmpty(subject))
                questionsQuery = questionsQuery.Where(q => q.Subject.ToLower() == subject.ToLower());

            if (!string.IsNullOrEmpty(difficulty) && Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
                questionsQuery = questionsQuery.Where(q => q.Difficulty == difficultyLevel);

            var questionData = await questionsQuery
                .OrderBy(q => Guid.NewGuid())
                .Take(count)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content,
                    optionsJson = q.Options,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType.ToString()
                })
                .ToListAsync();

            var questions = questionData.Select(q => new
            {
                id = q.id,
                questionText = q.questionText,
                options = !string.IsNullOrEmpty(q.optionsJson) ? 
                    System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.optionsJson) : 
                    new List<object>(),
                subject = q.subject,
                difficulty = q.difficulty,
                testType = q.testType
            }).ToList();

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving practice questions");
            return StatusCode(500, new { success = false, message = "Error retrieving practice questions" });
        }
    }

    [HttpGet("difficulty-distribution")]
    public async Task<IActionResult> GetDifficultyDistribution([FromQuery] string subject = "")
    {
        try
        {
            var questionsQuery = _context.Questions.Where(q => q.IsActive);

            if (!string.IsNullOrEmpty(subject))
                questionsQuery = questionsQuery.Where(q => q.Subject.ToLower() == subject.ToLower());

            var distribution = await questionsQuery
                .GroupBy(q => q.Difficulty)
                .Select(g => new
                {
                    difficulty = g.Key.ToString(),
                    count = g.Count(),
                    percentage = 0.0 // Will be calculated after getting total
                })
                .ToListAsync();

            var totalQuestions = distribution.Sum(d => d.count);
            var result = distribution.Select(d => new
            {
                difficulty = d.difficulty,
                count = d.count,
                percentage = totalQuestions > 0 ? Math.Round((double)d.count / totalQuestions * 100, 1) : 0
            }).ToList();

            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving difficulty distribution");
            return StatusCode(500, new { success = false, message = "Error retrieving difficulty distribution" });
        }
    }

    [HttpGet("question-banks")]
    public async Task<IActionResult> GetQuestionBanks()
    {
        try
        {
            var questionBanks = await _context.Courses
                .Where(c => c.Type == "question_bank")
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    id = c.Id,
                    title = c.Title,
                    description = c.Description,
                    createdAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = questionBanks });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving question banks");
            return StatusCode(500, new { success = false, message = "Error retrieving question banks" });
        }
    }

    [HttpGet("base-test")]
    public async Task<IActionResult> GetBaseTestQuestions(
        [FromQuery] string? subject = null,
        [FromQuery] int limit = 27,
        [FromQuery] string? questionBankId = null)
    {
        try
        {
            _logger.LogInformation("GetBaseTestQuestions called with subject={Subject}, limit={Limit}, questionBankId={QuestionBankId}", subject, limit, questionBankId);

            Guid? qbId = null;
            if (!string.IsNullOrWhiteSpace(questionBankId))
            {
                if (Guid.TryParse(questionBankId, out var parsed))
                {
                    qbId = parsed;
                }
                else
                {
                    _logger.LogWarning("Invalid questionBankId received: {QuestionBankId}", questionBankId);
                }
            }

            var query = _context.Questions
                .Where(q => q.IsActive && q.TestType == TestType.Base);
            
            // Filter by question bank if specified
            if (qbId.HasValue)
            {
                query = query.Where(q => q.QuestionBankId == qbId);
            }
            
            // Filter by subject if specified
            if (!string.IsNullOrEmpty(subject))
            {
                var normalized = subject.Trim().ToLowerInvariant();

                // Handle common synonyms and variations
                if (normalized.Contains("reading") || normalized.Contains("writing") || normalized.Contains("verbal") || normalized.Contains("english"))
                {
                    query = query.Where(q =>
                        q.Subject.Contains("Reading & Writing") ||
                        q.Subject.Contains("English") ||
                        q.Subject.Contains("Verbal") ||
                        q.Subject.Contains("Reading") ||
                        q.Subject.Contains("Writing"));
                }
                else if (normalized.Contains("math"))
                {
                    query = query.Where(q => q.Subject.Contains("Math"));
                }
                else
                {
                    // Fallback to original subject text
                    query = query.Where(q => q.Subject.Contains(subject));
                }
            }
            
            var questionData = await query
                .OrderBy(q => Guid.NewGuid()) // Random order
                .Take(limit)
                .Select(q => new
                {
                    q.Id,
                    q.Title,
                    q.QuestionParagraph,
                    Content = q.Content,
                    q.Subject,
                    Difficulty = q.Difficulty.ToString(),
                    TestType = q.TestType.ToString(),
                    q.CorrectAnswer,
                    Options = q.Options ?? "[]",
                    Tags = q.Tags ?? "[]",
                    q.Points,
                    q.CreatedAt,
                    q.IsActive
                })
                .ToListAsync();

            var questions = new List<object>();
            foreach (var q in questionData)
            {
                List<object> optionsList;
                try
                {
                    optionsList = !string.IsNullOrWhiteSpace(q.Options)
                        ? System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.Options) ?? new List<object>()
                        : new List<object>();
                }
                catch
                {
                    optionsList = new List<object>();
                }

                List<object> tagsList;
                try
                {
                    tagsList = !string.IsNullOrWhiteSpace(q.Tags)
                        ? System.Text.Json.JsonSerializer.Deserialize<List<object>>(q.Tags) ?? new List<object>()
                        : new List<object>();
                }
                catch
                {
                    tagsList = new List<object>();
                }

                questions.Add(new
                {
                    id = q.Id,
                    title = q.Title,
                    questionParagraph = q.QuestionParagraph,
                    content = q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty,
                    testType = q.TestType,
                    correctAnswer = q.CorrectAnswer,
                    options = optionsList,
                    tags = tagsList,
                    points = q.Points,
                    createdAt = q.CreatedAt,
                    isActive = q.IsActive
                });
            }

            return Ok(new { success = true, data = questions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving base test questions");
            return StatusCode(500, new { success = false, message = "Error retrieving base test questions" });
        }
    }
}

// Request DTOs
public class QuestionResponseRequest
{
    public Guid QuestionId { get; set; }
    public string UserAnswer { get; set; } = string.Empty;
    public int TimeSpent { get; set; }
}

public class AdaptiveQuestionsRequest
{
    public double UserAbility { get; set; }
    public string Subject { get; set; } = string.Empty;
    public List<Guid> PreviousQuestions { get; set; } = new();
}