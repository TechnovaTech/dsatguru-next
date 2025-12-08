using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class EnhancedQuestionController : ControllerBase
{
    private readonly AppDbContext _context;

    public EnhancedQuestionController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestions(
        [FromQuery] string? search = null,
        [FromQuery] string? topic = null,
        [FromQuery] string? subtopic = null,
        [FromQuery] int? difficulty = null,
        [FromQuery] int? subject = null,
        [FromQuery] int? status = null,
        [FromQuery] Guid? questionBankId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.EnhancedQuestions.Include(q => q.Creator).AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(q => q.Content.Contains(search) || q.Topic.Contains(search));

        if (!string.IsNullOrEmpty(topic))
            query = query.Where(q => q.Topic.Contains(topic));

        if (!string.IsNullOrEmpty(subtopic))
            query = query.Where(q => q.Subtopic != null && q.Subtopic.Contains(subtopic));

        if (difficulty.HasValue)
            query = query.Where(q => (int)q.Difficulty == difficulty.Value);

        if (subject.HasValue)
            query = query.Where(q => (int)q.Subject == subject.Value);

        if (status.HasValue)
            query = query.Where(q => (int)q.Status == status.Value);

        if (questionBankId.HasValue)
            query = query.Where(q => q.QuestionBankId == questionBankId.Value);

        if (fromDate.HasValue)
            query = query.Where(q => q.UpdatedAt >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(q => q.UpdatedAt <= toDate.Value);

        var totalCount = await query.CountAsync();
        var questionsQuery = await query
            .OrderByDescending(q => q.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(q => new
            {
                q.Id,
                q.Content,
                q.Topic,
                q.Subtopic,
                Difficulty = q.Difficulty.ToString(),
                Type = q.Type.ToString(),
                Subject = q.Subject.ToString(),
                Status = q.Status.ToString(),
                q.Points,
                q.UsageCount,
                q.AverageRating,
                q.SuccessRate,
                CreatedBy = q.Creator.Name,
                q.CreatedAt,
                q.UpdatedAt,
                q.Tags
            })
            .ToListAsync();

        var questions = questionsQuery.Select(q => new
        {
            q.Id,
            q.Content,
            q.Topic,
            q.Subtopic,
            q.Difficulty,
            q.Type,
            q.Subject,
            q.Status,
            q.Points,
            q.UsageCount,
            q.AverageRating,
            q.SuccessRate,
            q.CreatedBy,
            q.CreatedAt,
            q.UpdatedAt,
            Tags = string.IsNullOrEmpty(q.Tags) ? new string[0] : JsonSerializer.Deserialize<string[]>(q.Tags) ?? new string[0]
        }).ToList();

        return Ok(new
        {
            success = true,
            data = questions,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuestion(Guid id)
    {
        var question = await _context.EnhancedQuestions
            .Include(q => q.Creator)
            .Include(q => q.Ratings)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (question == null)
            return NotFound(new { success = false, message = "Question not found" });

        var options = string.IsNullOrEmpty(question.Options) ? new string[0] : JsonSerializer.Deserialize<string[]>(question.Options) ?? new string[0];
        var tags = string.IsNullOrEmpty(question.Tags) ? new string[0] : JsonSerializer.Deserialize<string[]>(question.Tags) ?? new string[0];

        return Ok(new
        {
            success = true,
            data = new
            {
                question.Id,
                question.Content,
                question.Explanation,
                question.Topic,
                question.Subtopic,
                Difficulty = question.Difficulty.ToString(),
                Type = question.Type.ToString(),
                Subject = question.Subject.ToString(),
                Status = question.Status.ToString(),
                question.CorrectAnswer,
                Options = options,
                question.Points,
                question.ImageUrl,
                Tags = tags,
                question.UsageCount,
                question.AverageRating,
                question.SuccessRate,
                CreatedBy = question.Creator.Name,
                question.CreatedAt,
                question.UpdatedAt
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateEnhancedQuestionDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var question = new EnhancedQuestion
        {
            Content = dto.Content,
            Explanation = dto.Explanation,
            Topic = dto.Topic,
            Subtopic = dto.Subtopic,
            Difficulty = dto.Difficulty,
            Type = dto.Type,
            Subject = dto.Subject,
            CorrectAnswer = dto.CorrectAnswer,
            Options = dto.Options?.Any() == true ? JsonSerializer.Serialize(dto.Options) : null,
            Points = dto.Points,
            Status = dto.Status,
            ImageUrl = dto.ImageUrl,
            Tags = dto.Tags?.Any() == true ? JsonSerializer.Serialize(dto.Tags) : null,
            CreatedBy = userId
        };

        _context.EnhancedQuestions.Add(question);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Question created successfully", id = question.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] UpdateEnhancedQuestionDto dto)
    {
        var question = await _context.EnhancedQuestions.FindAsync(id);
        if (question == null)
            return NotFound(new { success = false, message = "Question not found" });

        question.Content = dto.Content;
        question.Explanation = dto.Explanation;
        question.Topic = dto.Topic;
        question.Subtopic = dto.Subtopic;
        question.Difficulty = dto.Difficulty;
        question.Type = dto.Type;
        question.Subject = dto.Subject;
        question.CorrectAnswer = dto.CorrectAnswer;
        question.Options = dto.Options?.Any() == true ? JsonSerializer.Serialize(dto.Options) : null;
        question.Points = dto.Points;
        question.Status = dto.Status;
        question.ImageUrl = dto.ImageUrl;
        question.Tags = dto.Tags?.Any() == true ? JsonSerializer.Serialize(dto.Tags) : null;
        question.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Question updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        var question = await _context.EnhancedQuestions.FindAsync(id);
        if (question == null)
            return NotFound(new { success = false, message = "Question not found" });

        question.Status = QuestionStatus.Archived;
        question.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Question archived successfully" });
    }

    [HttpPost("bulk-import")]
    public async Task<IActionResult> BulkImport([FromBody] List<CreateEnhancedQuestionDto> questions)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);
        var validQuestions = new List<EnhancedQuestion>();
        var errors = new List<string>();

        foreach (var (dto, index) in questions.Select((q, i) => (q, i)))
        {
            try
            {
                var question = new EnhancedQuestion
                {
                    Content = dto.Content,
                    Explanation = dto.Explanation,
                    Topic = dto.Topic,
                    Subtopic = dto.Subtopic,
                    Difficulty = dto.Difficulty,
                    Type = dto.Type,
                    Subject = dto.Subject,
                    CorrectAnswer = dto.CorrectAnswer,
                    Options = dto.Options?.Any() == true ? JsonSerializer.Serialize(dto.Options) : null,
                    Points = dto.Points,
                    Status = dto.Status,
                    Tags = dto.Tags?.Any() == true ? JsonSerializer.Serialize(dto.Tags) : null,
                    CreatedBy = userId
                };
                validQuestions.Add(question);
            }
            catch (Exception ex)
            {
                errors.Add($"Row {index + 1}: {ex.Message}");
            }
        }

        if (validQuestions.Any())
        {
            _context.EnhancedQuestions.AddRange(validQuestions);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            success = true,
            message = $"Imported {validQuestions.Count} questions successfully",
            imported = validQuestions.Count,
            errors = errors
        });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        var totalQuestions = await _context.EnhancedQuestions.CountAsync();
        var activeQuestions = await _context.EnhancedQuestions.CountAsync(q => q.Status == QuestionStatus.Active);
        
        var mostUsedQuestions = await _context.EnhancedQuestions
            .Where(q => q.UsageCount > 0)
            .OrderByDescending(q => q.UsageCount)
            .Take(10)
            .Select(q => new { q.Id, q.Content, q.Topic, q.UsageCount })
            .ToListAsync();

        var successRatesByDifficulty = await _context.EnhancedQuestions
            .Where(q => q.SuccessRate > 0)
            .GroupBy(q => q.Difficulty)
            .Select(g => new
            {
                Difficulty = g.Key.ToString(),
                AverageSuccessRate = g.Average(q => q.SuccessRate),
                Count = g.Count()
            })
            .ToListAsync();

        var topRatedQuestions = await _context.EnhancedQuestions
            .Where(q => q.AverageRating > 0)
            .OrderByDescending(q => q.AverageRating)
            .Take(10)
            .Select(q => new { q.Id, q.Content, q.Topic, q.AverageRating, q.TotalRatings })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalQuestions,
                activeQuestions,
                mostUsedQuestions,
                successRatesByDifficulty,
                topRatedQuestions
            }
        });
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportQuestions([FromQuery] string format = "csv")
    {
        var questions = await _context.EnhancedQuestions
            .Include(q => q.Creator)
            .Where(q => q.Status == QuestionStatus.Active)
            .ToListAsync();

        if (format.ToLower() == "csv")
        {
            var csv = GenerateCsv(questions);
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", "questions.csv");
        }

        return BadRequest(new { success = false, message = "Unsupported format" });
    }

    private string GenerateCsv(List<EnhancedQuestion> questions)
    {
        var csv = "Content,Topic,Subtopic,Difficulty,Type,Subject,CorrectAnswer,Options,Points,Tags\n";
        foreach (var q in questions)
        {
            var options = string.IsNullOrEmpty(q.Options) ? "" : string.Join(";", JsonSerializer.Deserialize<string[]>(q.Options) ?? Array.Empty<string>());
            var tags = string.IsNullOrEmpty(q.Tags) ? "" : string.Join(";", JsonSerializer.Deserialize<string[]>(q.Tags) ?? Array.Empty<string>());
            
            csv += $"\"{q.Content}\",\"{q.Topic}\",\"{q.Subtopic}\",\"{q.Difficulty}\",\"{q.Type}\",\"{q.Subject}\",\"{q.CorrectAnswer}\",\"{options}\",{q.Points},\"{tags}\"\n";
        }
        return csv;
    }
}

public class CreateEnhancedQuestionDto
{
    public string Content { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string Topic { get; set; } = string.Empty;
    public string? Subtopic { get; set; }
    public DifficultyLevel Difficulty { get; set; }
    public QuestionType Type { get; set; }
    public SubjectType Subject { get; set; }
    public string? CorrectAnswer { get; set; }
    public string[]? Options { get; set; }
    public int Points { get; set; } = 1;
    public QuestionStatus Status { get; set; } = QuestionStatus.Draft;
    public string? ImageUrl { get; set; }
    public string[]? Tags { get; set; }
}

public class UpdateEnhancedQuestionDto : CreateEnhancedQuestionDto { }