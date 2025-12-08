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
[Authorize(Roles = "Admin")]
public class QuestionBankManagementController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuestionBankManagementController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all active question banks (courses) for selection
    /// </summary>
    [HttpGet("question-banks")]
    public async Task<IActionResult> GetQuestionBanksForSelection(
        [FromQuery] string? search = null)
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
                    c.Id,
                    Name = c.Title,
                    c.Description,
                    Subject = "Mixed", // Course-based question banks can have mixed subjects
                    c.CreatedAt,
                    CreatedBy = "Course-based",
                    TotalQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id),
                    ActiveQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id && q.IsActive),
                    DraftQuestions = _context.Questions.Count(q => q.QuestionBankId == c.Id && !q.IsActive),
                    Status = "Active" // Courses are always active if they exist
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
            return StatusCode(500, new 
            { 
                success = false, 
                message = "Failed to fetch question banks", 
                error = ex.Message 
            });
        }
    }

    /// <summary>
    /// Get questions for a specific question bank (course)
    /// </summary>
    [HttpGet("question-banks/{questionBankId}/questions")]
    public async Task<IActionResult> GetQuestionsByBank(
        Guid questionBankId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? status = null)
    {
        try
        {
            // Verify course (question bank) exists
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == questionBankId && c.Type == "question_bank");

            if (course == null)
            {
                return NotFound(new 
                { 
                    success = false, 
                    message = "Question bank not found or inactive" 
                });
            }

            // Build query for questions filtered by QuestionBankId
            var query = _context.Questions
                .Where(q => q.QuestionBankId == questionBankId)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(q => q.Title.Contains(search) || 
                                        q.Content.Contains(search));
            }

            if (!string.IsNullOrEmpty(difficulty) && Enum.TryParse<DifficultyLevel>(difficulty, out var difficultyEnum))
            {
                query = query.Where(q => q.Difficulty == difficultyEnum);
            }

            if (!string.IsNullOrEmpty(status))
            {
                var isActive = status.ToLower() == "active";
                query = query.Where(q => q.IsActive == isActive);
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var questions = await query
                .OrderByDescending(q => q.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(q => new
                {
                    q.Id,
                    q.Title,
                    QuestionText = q.Title, // Keep for backward compatibility
                    q.Content,
                    q.Subject,
                    q.QuestionParagraph,
                    q.Explanation,
                    q.CorrectAnswer,
                    Options = q.Options, // Keep as JSON string, will be parsed by frontend
                    Tags = q.Tags, // Keep as JSON string, will be parsed by frontend
                    Topic = q.Tags != null ? q.Tags : "No topic", // Use Tags field for topic information
                    ModuleType = q.TestType.ToString(), // Map TestType to ModuleType
                    QuestionType = q.Type.ToString(), // Map Type to QuestionType
                    Difficulty = (int)q.Difficulty, // Return as integer for consistency
                    TestType = (int)q.TestType, // Return as integer for consistency
                    Type = (int)q.Type, // Return as integer for consistency
                    Status = q.IsActive ? "Active" : "Draft",
                    q.CreatedAt,
                    q.ImageUrl,
                    q.IsActive,
                    q.Points,
                    q.QuestionBankId
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = questions,
                pagination = new
                {
                    totalCount,
                    totalPages,
                    currentPage = page,
                    pageSize
                },
                questionBank = new
                {
                    course.Id,
                    Name = course.Title,
                    course.Description,
                    Subject = "Mixed" // Course-based question banks can have mixed subjects
                },
                message = "Questions retrieved successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                success = false, 
                message = "Failed to fetch questions", 
                error = ex.Message 
            });
        }
    }

    /// <summary>
    /// Update a question
    /// </summary>
    [HttpPut("questions/{questionId}")]
    public async Task<IActionResult> UpdateQuestion(Guid questionId, [FromBody] UpdateQuestionInBankDto dto)
    {
        try
        {
            var question = await _context.Questions.FindAsync(questionId);
            if (question == null)
            {
                return NotFound(new 
                { 
                    success = false, 
                    message = "Question not found" 
                });
            }

            // Update fields if provided
            if (!string.IsNullOrEmpty(dto.Title))
                question.Title = dto.Title;
                
            if (!string.IsNullOrEmpty(dto.QuestionText))
                question.Content = dto.QuestionText;
                
            if (!string.IsNullOrEmpty(dto.Content))
                question.Content = dto.Content;
                
            if (!string.IsNullOrEmpty(dto.Explanation))
                question.Explanation = dto.Explanation;
                
            if (!string.IsNullOrEmpty(dto.Subject))
                question.Subject = dto.Subject;
            
            if (!string.IsNullOrEmpty(dto.Difficulty))
            {
                if (Enum.TryParse<DifficultyLevel>(dto.Difficulty, out var difficulty))
                    question.Difficulty = difficulty;
            }

            if (!string.IsNullOrEmpty(dto.Status))
            {
                question.IsActive = dto.Status.ToLower() == "active";
            }
            
            if (!string.IsNullOrEmpty(dto.CorrectAnswer))
                question.CorrectAnswer = dto.CorrectAnswer;
                
            if (!string.IsNullOrEmpty(dto.Options))
                question.Options = dto.Options;
                
            if (!string.IsNullOrEmpty(dto.Tags))
                question.Tags = dto.Tags;
                
            if (dto.Points.HasValue)
                question.Points = dto.Points.Value;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Question updated successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                success = false, 
                message = "Failed to update question", 
                error = ex.Message 
            });
        }
    }

    /// <summary>
    /// Create a new question in a question bank
    /// </summary>
    [HttpPost("question-banks/{questionBankId}/questions")]
    public async Task<IActionResult> CreateQuestion(Guid questionBankId, [FromBody] CreateQuestionDto dto)
    {
        try
        {
            // Verify course (question bank) exists
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == questionBankId && c.Type == "question_bank");

            if (course == null)
            {
                return NotFound(new 
                { 
                    success = false, 
                    message = "Question bank not found" 
                });
            }

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException());

            var question = new Question
            {
                Title = dto.Title,
                Content = dto.Content,
                Explanation = dto.Explanation,
                Subject = dto.Subject,
                Difficulty = dto.Difficulty,
                Type = dto.Type,
                TestType = dto.TestType,
                CorrectAnswer = dto.CorrectAnswer,
                Options = string.Join(",", dto.Options),
                Tags = string.Join(",", dto.Tags),
                Points = dto.Points,
                IsActive = true,
                CreatedBy = userId,
                QuestionBankId = questionBankId
            };

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Question created successfully",
                data = new { question.Id }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                success = false, 
                message = "Failed to create question", 
                error = ex.Message 
            });
        }
    }

    /// <summary>
    /// Delete a question
    /// </summary>
    [HttpDelete("questions/{questionId}")]
    public async Task<IActionResult> DeleteQuestion(Guid questionId)
    {
        try
        {
            var question = await _context.Questions.FindAsync(questionId);
            if (question == null)
            {
                return NotFound(new 
                { 
                    success = false, 
                    message = "Question not found" 
                });
            }

            _context.Questions.Remove(question);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Question deleted successfully"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new 
            { 
                success = false, 
                message = "Failed to delete question", 
                error = ex.Message 
            });
        }
    }
}



/// <summary>
/// DTO for updating questions in question bank management
/// </summary>
public class UpdateQuestionInBankDto
{
    public string? Title { get; set; }
    public string? QuestionText { get; set; }
    public string? Content { get; set; }
    public string? Explanation { get; set; }
    public string? Subject { get; set; }
    public string? Difficulty { get; set; }
    public string? Status { get; set; }
    public string? CorrectAnswer { get; set; }
    public string? Options { get; set; }
    public string? Tags { get; set; }
    public int? Points { get; set; }
}