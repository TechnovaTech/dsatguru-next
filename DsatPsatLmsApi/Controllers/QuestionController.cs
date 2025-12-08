using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Text;
using CsvHelper;
using System.Globalization;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/questions")]
[Authorize(Roles = "Admin")]
public class QuestionController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuestionController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all active question banks (courses) for selection
    /// </summary>
    [HttpGet("question-banks")]
    public async Task<IActionResult> GetQuestionBanks([FromQuery] string? search = null)
    {
        try
        {
            var query = _context.Courses
                .Where(c => c.Type == "question_bank")
                .AsQueryable();

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(c => c.Title.Contains(search) || 
                                         (c.Description != null && c.Description.Contains(search)));
            }

            var questionBanks = await query
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new
                {
                    id = c.Id,
                    title = c.Title,
                    name = c.Title, // Keep both for compatibility
                    description = c.Description,
                    subject = "Mixed", // Course-based question banks can have mixed subjects
                    createdAt = c.CreatedAt,
                    createdBy = "Course-based",
                    totalQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id),
                    activeQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id && q.IsActive),
                    draftQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id && !q.IsActive),
                    status = "Active" // Courses are always active if they exist
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = questionBanks,
                message = "Question banks retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving question banks: {ex.Message}" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestions(
        [FromQuery] string? subject = null, 
        [FromQuery] int? difficulty = null, 
        [FromQuery] int? testType = null,
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        var query = _context.Questions.Include(q => q.Creator);
        
        // Filter by active status if specified
        if (isActive.HasValue)
        {
            query = query.Where(q => q.IsActive == isActive.Value).Include(q => q.Creator);
        }

        if (!string.IsNullOrEmpty(subject))
            query = query.Where(q => q.Subject.Contains(subject)).Include(q => q.Creator);

        if (difficulty.HasValue && Enum.IsDefined(typeof(DifficultyLevel), difficulty.Value))
            query = query.Where(q => (int)q.Difficulty == difficulty.Value).Include(q => q.Creator);
            
        if (testType.HasValue && Enum.IsDefined(typeof(TestType), testType.Value))
            query = query.Where(q => (int)q.TestType == testType.Value).Include(q => q.Creator);
            
        if (!string.IsNullOrEmpty(search))
        {
            var searchTerm = search;
            query = query.Where(q => q.Title.Contains(searchTerm) || q.Content.Contains(searchTerm)).Include(q => q.Creator);
        }

        var questionsData = await query
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();
            
        var questions = questionsData.Select(q => new
        {
            q.Id,
            q.Title,
            q.QuestionParagraph,
            q.Content,
            q.Subject,
            Difficulty = q.Difficulty.ToString(),
            TestType = q.TestType.ToString(),
            q.CorrectAnswer,
            Options = JsonSerializer.Deserialize<List<string>>(q.Options ?? "[]"),
            Tags = JsonSerializer.Deserialize<List<string>>(q.Tags ?? "[]"),
            q.Points,
            q.ImageUrl,
            CreatedBy = q.Creator.Name,
            q.CreatedAt,
            q.IsActive
        }).ToList();

        return Ok(new { success = true, data = questions });
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionDto dto)
    {
        try
        {
            if (dto == null)
                return BadRequest(new { success = false, message = "Question data is required" });
                
            // Validate question bank if provided
            if (dto.QuestionBankId.HasValue)
            {
                var course = await _context.Courses.FindAsync(dto.QuestionBankId.Value);
                if (course == null || course.Type != "question_bank")
                    return BadRequest(new { success = false, message = "Invalid Question Bank ID" });
            }
                
            // Find an admin user to use as the creator
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);
            if (adminUser == null)
            {
                // Create a default admin user if none exists
                adminUser = new User
                {
                    Name = "System Admin",
                    Email = "admin@dsatguru.com",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin123"), // Default password
                    Role = UserRole.Admin
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();
            }
            
            var question = new Question
            {
                Title = dto.Title ?? "Untitled Question",
                QuestionParagraph = dto.QuestionParagraph,
                Content = dto.Content ?? "No content provided",
                Explanation = dto.Explanation,
                Subject = dto.Subject ?? "Math",
                Difficulty = dto.Difficulty,
                Type = dto.Type,
                TestType = dto.TestType,
                CorrectAnswer = dto.CorrectAnswer ?? "A",
                Options = JsonSerializer.Serialize(dto.Options ?? new List<string>()),
                Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>()),
                Points = dto.Points,
                QuestionBankId = dto.QuestionBankId,
                ImageUrl = dto.ImageUrl,
                CreatedBy = adminUser.Id
            };

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Question created successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error creating question: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] UpdateQuestionDto dto)
    {
        try
        {
            var question = await _context.Questions.FindAsync(id);
            if (question == null)
                return NotFound(new { success = false, message = "Question not found" });

            if (dto == null)
                return BadRequest(new { success = false, message = "Question data is required" });

            question.Title = dto.Title ?? question.Title;
            question.QuestionParagraph = dto.QuestionParagraph;
            question.Content = dto.Content ?? question.Content;
            question.Explanation = dto.Explanation;
            question.Subject = dto.Subject ?? question.Subject;
            question.Difficulty = dto.Difficulty;
            question.Type = dto.Type;
            question.TestType = dto.TestType;
            question.CorrectAnswer = dto.CorrectAnswer ?? question.CorrectAnswer;
            question.Options = JsonSerializer.Serialize(dto.Options ?? new List<string>());
            question.Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>());
            question.Points = dto.Points;
            question.ImageUrl = dto.ImageUrl ?? question.ImageUrl;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Question updated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error updating question: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuestionById(Guid id)
    {
        try
        {
            var question = await _context.Questions
                .Where(q => q.Id == id && q.IsActive)
                .FirstOrDefaultAsync();

            if (question == null)
            {
                return NotFound(new { success = false, message = "Question not found or inactive" });
            }

            // Parse JSON fields with fallback to comma-separated values
            List<string> options = new List<string>();
            List<string> tags = new List<string>();
            
            try
            {
                if (!string.IsNullOrEmpty(question.Options))
                    options = JsonSerializer.Deserialize<List<string>>(question.Options) ?? new List<string>();
            }
            catch (JsonException)
            {
                // If JSON parsing fails, try to split by comma as fallback
                options = question.Options?.Split(',').Select(o => o.Trim()).ToList() ?? new List<string>();
            }
            
            try
            {
                if (!string.IsNullOrEmpty(question.Tags))
                    tags = JsonSerializer.Deserialize<List<string>>(question.Tags) ?? new List<string>();
            }
            catch (JsonException)
            {
                // If JSON parsing fails, try to split by comma as fallback
                tags = question.Tags?.Split(',').Select(t => t.Trim()).ToList() ?? new List<string>();
            }

            var questionData = new
            {
                id = question.Id,
                title = question.Title,
                questionParagraph = question.QuestionParagraph,
                content = question.Content,
                explanation = question.Explanation,
                subject = question.Subject,
                difficulty = (int)question.Difficulty,
                type = (int)question.Type,
                testType = (int)question.TestType,
                correctAnswer = question.CorrectAnswer,
                options = options,
                tags = tags,
                points = question.Points,
                questionBankId = question.QuestionBankId,
                imageUrl = question.ImageUrl,
                isActive = question.IsActive,
                createdAt = question.CreatedAt
            };

            return Ok(new { success = true, data = questionData });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving question: {ex.Message}" });
        }
    }

    /// <summary>
    /// Get questions by question bank with enhanced filtering and pagination
    /// </summary>
    [HttpGet("by-bank/{questionBankId}")]
    public async Task<IActionResult> GetQuestionsByQuestionBank(
        Guid questionBankId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? subject = null,
        [FromQuery] int? difficulty = null,
        [FromQuery] int? testType = null,
        [FromQuery] bool? isActive = true)
    {
        try
        {
            // Verify question bank exists
            var questionBank = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == questionBankId && c.Type == "question_bank");

            if (questionBank == null)
            {
                return NotFound(new { success = false, message = "Question bank not found" });
            }

            // Build query
            var query = _context.Questions
                .Where(q => q.QuestionBankId == questionBankId)
                .AsQueryable();

            // Apply filters
            if (isActive.HasValue)
            {
                query = query.Where(q => q.IsActive == isActive.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                var searchTerm = search.ToLower();
                query = query.Where(q => 
                    q.Title.ToLower().Contains(searchTerm) ||
                    q.Content.ToLower().Contains(searchTerm) ||
                    q.QuestionParagraph.ToLower().Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(subject))
            {
                query = query.Where(q => q.Subject.ToLower().Contains(subject.ToLower()));
            }

            if (difficulty.HasValue && Enum.IsDefined(typeof(DifficultyLevel), difficulty.Value))
            {
                query = query.Where(q => (int)q.Difficulty == difficulty.Value);
            }

            if (testType.HasValue && Enum.IsDefined(typeof(TestType), testType.Value))
            {
                query = query.Where(q => (int)q.TestType == testType.Value);
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            // Get paginated results
            var questions = await query
                .OrderByDescending(q => q.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(q => new
                {
                    id = q.Id,
                    title = q.Title,
                    content = q.Content,
                    subject = q.Subject,
                    difficulty = (int)q.Difficulty,
                    testType = (int)q.TestType,
                    type = (int)q.Type,
                    correctAnswer = q.CorrectAnswer,
                    questionParagraph = q.QuestionParagraph,
                    explanation = q.Explanation,
                    options = q.Options, // Keep as JSON string for frontend parsing
                    tags = q.Tags, // Keep as JSON string for frontend parsing
                    points = q.Points,
                    questionBankId = q.QuestionBankId,
                    imageUrl = q.ImageUrl,
                    isActive = q.IsActive,
                    createdAt = q.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = questions,
                pagination = new
                {
                    currentPage = page,
                    pageSize = pageSize,
                    totalCount = totalCount,
                    totalPages = totalPages,
                    hasNextPage = page < totalPages,
                    hasPreviousPage = page > 1
                },
                questionBank = new
                {
                    id = questionBank.Id,
                    title = questionBank.Title,
                    description = questionBank.Description
                },
                filters = new
                {
                    search = search,
                    subject = subject,
                    difficulty = difficulty,
                    testType = testType,
                    isActive = isActive
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving questions: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        Console.WriteLine($"DELETE request received for question ID: {id}");
        
        var question = await _context.Questions.FindAsync(id);
        if (question == null)
        {
            Console.WriteLine($"Question with ID {id} not found");
            return NotFound(new { success = false, message = "Question not found" });
        }

        Console.WriteLine($"Soft deleting question: {question.Title}");
        question.IsActive = false;
        await _context.SaveChangesAsync();
        Console.WriteLine($"Question {id} successfully soft deleted");
        return Ok(new { success = true, message = "Question deleted successfully" });
    }
    
    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            // Get all questions (both active and inactive)
            var query = _context.Questions.AsQueryable();
            
            var allQuestions = await query.ToListAsync();
            var activeQuestions = allQuestions.Where(q => q.IsActive).ToList();
            var inactiveQuestions = allQuestions.Where(q => !q.IsActive).ToList();
            
            var totalQuestions = allQuestions.Count;
            var activeCount = activeQuestions.Count;
            var inactiveCount = inactiveQuestions.Count;
            
            // Count by test type (only active questions)
            var byTestType = new
            {
                Base = activeQuestions.Count(q => q.TestType == TestType.Base),
                Adaptive = activeQuestions.Count(q => q.TestType == TestType.Adaptive)
            };
            
            // Count by subject (only active questions)
            var bySubject = new
            {
                Math = activeQuestions.Count(q => q.Subject == "Math"),
                ReadingWriting = activeQuestions.Count(q => q.Subject == "Reading & Writing")
            };
            
            // Count by difficulty (only active questions)
            var byDifficulty = new
            {
                Easy = activeQuestions.Count(q => q.Difficulty == DifficultyLevel.Easy),
                Medium = activeQuestions.Count(q => q.Difficulty == DifficultyLevel.Medium),
                Hard = activeQuestions.Count(q => q.Difficulty == DifficultyLevel.Hard)
            };
            
            // Detailed distribution
            var detailedDistribution = new List<object>();
            
            // Base Math questions
            var baseMathEasy = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Easy);
            var baseMathMedium = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Medium);
            var baseMathHard = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Hard);
            var baseMathTotal = baseMathEasy + baseMathMedium + baseMathHard;
            
            // Base Reading & Writing questions
            var baseRWEasy = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Easy);
            var baseRWMedium = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Medium);
            var baseRWHard = activeQuestions.Count(q => q.TestType == TestType.Base && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Hard);
            var baseRWTotal = baseRWEasy + baseRWMedium + baseRWHard;
            
            // Adaptive Math questions
            var adaptiveMathEasy = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Easy);
            var adaptiveMathMedium = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Medium);
            var adaptiveMathHard = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Math" && q.Difficulty == DifficultyLevel.Hard);
            var adaptiveMathTotal = adaptiveMathEasy + adaptiveMathMedium + adaptiveMathHard;
            
            // Adaptive Reading & Writing questions
            var adaptiveRWEasy = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Easy);
            var adaptiveRWMedium = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Medium);
            var adaptiveRWHard = activeQuestions.Count(q => q.TestType == TestType.Adaptive && q.Subject == "Reading & Writing" && q.Difficulty == DifficultyLevel.Hard);
            var adaptiveRWTotal = adaptiveRWEasy + adaptiveRWMedium + adaptiveRWHard;
            
            // Total by difficulty
            var totalEasy = baseMathEasy + baseRWEasy + adaptiveMathEasy + adaptiveRWEasy;
            var totalMedium = baseMathMedium + baseRWMedium + adaptiveMathMedium + adaptiveRWMedium;
            var totalHard = baseMathHard + baseRWHard + adaptiveMathHard + adaptiveRWHard;
            
            // Create detailed distribution object
            var distribution = new
            {
                baseMath = new { easy = baseMathEasy, medium = baseMathMedium, hard = baseMathHard, total = baseMathTotal },
                baseRW = new { easy = baseRWEasy, medium = baseRWMedium, hard = baseRWHard, total = baseRWTotal },
                adaptiveMath = new { easy = adaptiveMathEasy, medium = adaptiveMathMedium, hard = adaptiveMathHard, total = adaptiveMathTotal },
                adaptiveRW = new { easy = adaptiveRWEasy, medium = adaptiveRWMedium, hard = adaptiveRWHard, total = adaptiveRWTotal },
                totals = new { easy = totalEasy, medium = totalMedium, hard = totalHard, total = totalQuestions }
            };
            
            // Create a statistics object with the correct property names
            var statistics = new
            {
                totalQuestions,
                activeQuestions = activeCount,
                inactiveQuestions = inactiveCount,
                byTestType = new
                {
                    Base = byTestType.Base,
                    Adaptive = byTestType.Adaptive
                },
                bySubject = new
                {
                    Math = bySubject.Math,
                    ReadingWriting = bySubject.ReadingWriting
                },
                byDifficulty = new
                {
                    Easy = byDifficulty.Easy,
                    Medium = byDifficulty.Medium,
                    Hard = byDifficulty.Hard
                },
                distribution
            };
            
            Console.WriteLine($"Statistics data: {JsonSerializer.Serialize(statistics)}");
            
            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error getting statistics: {ex.Message}" });
        }
    }
    
    [HttpPost("bulk-upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkUpload(IFormFile file, [FromForm] string questionBankId, [FromForm] List<IFormFile>? images)
    {
        try
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded" });

            // Validate questionBankId
            if (string.IsNullOrEmpty(questionBankId) || !Guid.TryParse(questionBankId, out var questionBankGuid))
                return BadRequest(new { success = false, message = "Valid Question Bank ID is required" });

            // Verify course (question bank) exists
            var course = await _context.Courses.FindAsync(questionBankGuid);
            if (course == null || course.Type != "question_bank")
                return BadRequest(new { success = false, message = "Question Bank not found" });

            // Find an admin user to use as the creator
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Name = "System Admin",
                    Email = "admin@dsatguru.com",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin123"), // Default password
                    Role = UserRole.Admin
                };
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();
            }

            var successCount = 0;
            var errorCount = 0;

            using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
            var csvConfig = new CsvHelper.Configuration.CsvConfiguration(System.Globalization.CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                BadDataFound = null,
                IgnoreBlankLines = true,
                TrimOptions = CsvHelper.Configuration.TrimOptions.Trim
            };

            using var csv = new CsvReader(reader, csvConfig);
            // Read header to enable name-based access
            csv.Read();
            csv.ReadHeader();

            while (csv.Read())
            {
                try
                {
                    string? title = csv.TryGetField<string>("Title", out var vTitle) ? vTitle : null;
                    string? questionParagraph = csv.TryGetField<string>("QuestionParagraph", out var vQP) ? vQP : null;
                    string? contentField = csv.TryGetField<string>("Content", out var vContent) ? vContent : null;
                    string? subject = csv.TryGetField<string>("Subject", out var vSubject) ? vSubject : null;
                    string? difficultyStr = csv.TryGetField<string>("Difficulty", out var vDiff) ? vDiff : null;
                    string? testTypeStr = csv.TryGetField<string>("TestType", out var vTT) ? vTT : null;
                    string? correctAnswer = csv.TryGetField<string>("CorrectAnswer", out var vCA) ? vCA : null;
                    string? optionA = csv.TryGetField<string>("OptionA", out var vOA) ? vOA : null;
                    string? optionB = csv.TryGetField<string>("OptionB", out var vOB) ? vOB : null;
                    string? optionC = csv.TryGetField<string>("OptionC", out var vOC) ? vOC : null;
                    string? optionD = csv.TryGetField<string>("OptionD", out var vOD) ? vOD : null;
                    string? explanation = csv.TryGetField<string>("Explanation", out var vExp) ? vExp : null;
                    string? tagsStr = csv.TryGetField<string>("Tags", out var vTags) ? vTags : null;
                    string? mathTopic = csv.TryGetField<string>("MathTopic", out var vMT) ? vMT : null;
                    string? mathSubtopic = csv.TryGetField<string>("MathSubtopic", out var vMST) ? vMST : null;
                    string? rwTopic = csv.TryGetField<string>("ReadingWritingTopic", out var vRWT) ? vRWT : null;
                    string? imageFileName = csv.TryGetField<string>("ImageFileName", out var vImg) ? vImg : null;

                    // Build content with optional paragraph prefix
                    var finalContentBuilder = new StringBuilder();
                    if (!string.IsNullOrWhiteSpace(questionParagraph))
                    {
                        finalContentBuilder.Append(questionParagraph.Trim());
                        finalContentBuilder.AppendLine();
                        finalContentBuilder.AppendLine();
                    }
                    if (!string.IsNullOrWhiteSpace(contentField))
                    {
                        finalContentBuilder.Append(contentField.Trim());
                    }

                    // Build tags list
                    var tagsList = new List<string>();
                    if (!string.IsNullOrWhiteSpace(tagsStr))
                    {
                        tagsList.AddRange(tagsStr.Split(',').Select(t => t.Trim()).Where(t => !string.IsNullOrWhiteSpace(t)));
                    }
                    if (!string.IsNullOrWhiteSpace(mathTopic)) tagsList.Add(mathTopic.Trim());
                    if (!string.IsNullOrWhiteSpace(mathSubtopic)) tagsList.Add(mathSubtopic.Trim());
                    if (!string.IsNullOrWhiteSpace(rwTopic)) tagsList.Add(rwTopic.Trim());

                    var optionsList = new List<string>
                    {
                        optionA ?? string.Empty,
                        optionB ?? string.Empty,
                        optionC ?? string.Empty,
                        optionD ?? string.Empty
                    };

                    var question = new Question
                    {
                        Title = !string.IsNullOrWhiteSpace(title) ? title.Trim('"') : "Untitled Question",
                        QuestionParagraph = string.IsNullOrWhiteSpace(questionParagraph) ? null : questionParagraph,
                        Content = !string.IsNullOrWhiteSpace(finalContentBuilder.ToString()) ? finalContentBuilder.ToString() : (contentField ?? "No content"),
                        Subject = !string.IsNullOrWhiteSpace(subject) ? subject.Trim() : "Math",
                        Difficulty = !string.IsNullOrWhiteSpace(difficultyStr) ? ParseDifficulty(difficultyStr.Trim('"')) : DifficultyLevel.Easy,
                        TestType = !string.IsNullOrWhiteSpace(testTypeStr) ? ParseTestType(testTypeStr.Trim('"')) : TestType.Base,
                        Type = QuestionType.MultipleChoice,
                        CorrectAnswer = !string.IsNullOrWhiteSpace(correctAnswer) ? correctAnswer.Trim('"') : "A",
                        Options = JsonSerializer.Serialize(optionsList),
                        Explanation = string.IsNullOrWhiteSpace(explanation) ? string.Empty : explanation.Trim('"'),
                        Tags = JsonSerializer.Serialize(tagsList),
                        Points = 1,
                        CreatedBy = adminUser.Id,
                        QuestionBankId = questionBankGuid
                    };

                    // Try map and save image if provided
                    if (!string.IsNullOrWhiteSpace(imageFileName) && images != null && images.Count > 0)
                    {
                        var matched = images.FirstOrDefault(f => string.Equals(f.FileName, imageFileName, StringComparison.OrdinalIgnoreCase));
                        if (matched != null)
                        {
                            var imgUrl = await SaveImageAndGetUrl(matched);
                            question.ImageUrl = imgUrl;
                        }
                    }

                    _context.Questions.Add(question);
                    successCount++;
                }
                catch
                {
                    errorCount++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Bulk upload completed. {successCount} questions added successfully, {errorCount} failed."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error processing file: {ex.Message}" });
        }
    }
    
    private DifficultyLevel ParseDifficulty(string value)
    {
        return value.ToLower() switch
        {
            "easy" => DifficultyLevel.Easy,
            "medium" => DifficultyLevel.Medium,
            "hard" => DifficultyLevel.Hard,
            _ => DifficultyLevel.Medium
        };
    }
    
    private TestType ParseTestType(string value)
    {
        return value.ToLower() switch
        {
            "base" => TestType.Base,
            "adaptive" => TestType.Adaptive,
            _ => TestType.Base
        };
    }
    
    private async Task<string> SaveImageAndGetUrl(IFormFile imageFile)
    {
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(imageFile.ContentType))
            throw new InvalidOperationException("Invalid image format. Only JPG, PNG, GIF, WEBP are allowed.");

        if (imageFile.Length > 5 * 1024 * 1024)
            throw new InvalidOperationException("Image size exceeds 5MB.");

        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "images");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(imageFile.FileName)}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await imageFile.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
        var fileUrl = $"{baseUrl}/uploads/images/{uniqueFileName}";
        return fileUrl;
    }
    
    [HttpGet("template")]
    [AllowAnonymous]
    public IActionResult DownloadTemplate()
    {
        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "question_template.csv");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { success = false, message = "Template file not found" });
        }
        
        return PhysicalFile(filePath, "text/csv", "question_template.csv");
    }
}

public class CreateQuestionDto
{
    public string Title { get; set; } = string.Empty;
    public string? QuestionParagraph { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string Subject { get; set; } = "Math";
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Easy;
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    public TestType TestType { get; set; } = TestType.Base;
    public string CorrectAnswer { get; set; } = "A";
    public List<string> Options { get; set; } = new List<string>();
    public List<string> Tags { get; set; } = new List<string>();
    public int Points { get; set; } = 1;
    public Guid? QuestionBankId { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateQuestionDto : CreateQuestionDto { }

