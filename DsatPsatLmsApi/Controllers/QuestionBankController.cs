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
public class QuestionBankController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuestionBankController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestionBanks(
        [FromQuery] string? search = null,
        [FromQuery] int? subject = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var query = _context.QuestionBanks
                .Include(qb => qb.Creator)
                .Include(qb => qb.Questions)
                .AsQueryable();

            // Apply filters
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(qb => qb.Name.Contains(search) || 
                                         (qb.Description != null && qb.Description.Contains(search)));
            }

            if (subject.HasValue && Enum.IsDefined(typeof(SubjectType), subject.Value))
            {
                query = query.Where(qb => (int)qb.Subject == subject.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(qb => qb.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var questionBankData = await query
                .OrderByDescending(qb => qb.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(qb => new
                {
                    qb.Id,
                    qb.Name,
                    qb.Description,
                    Subject = qb.Subject.ToString(),
                    qb.Tags,
                    qb.IsActive,
                    qb.CreatedAt,
                    qb.UpdatedAt,
                    CreatedBy = qb.Creator.Name,
                    TotalQuestions = qb.Questions.Count,
                    ActiveQuestions = qb.Questions.Count(q => q.Status == QuestionStatus.Active),
                    DraftQuestions = qb.Questions.Count(q => q.Status == QuestionStatus.Draft)
                })
                .ToListAsync();

            var questionBanks = questionBankData.Select(qb => new
            {
                qb.Id,
                qb.Name,
                qb.Description,
                qb.Subject,
                Tags = JsonSerializer.Deserialize<List<string>>(qb.Tags ?? "[]"),
                qb.IsActive,
                qb.CreatedAt,
                qb.UpdatedAt,
                qb.CreatedBy,
                qb.TotalQuestions,
                qb.ActiveQuestions,
                qb.DraftQuestions
            }).ToList();

            return Ok(new
            {
                success = true,
                questionBanks,
                totalCount,
                totalPages,
                currentPage = page,
                pageSize
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to fetch question banks", error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuestionBank(Guid id)
    {
        try
        {
            var questionBank = await _context.QuestionBanks
                .Include(qb => qb.Creator)
                .Include(qb => qb.Questions)
                .FirstOrDefaultAsync(qb => qb.Id == id);

            if (questionBank == null)
            {
                return NotFound(new { success = false, message = "Question bank not found" });
            }

            var result = new
            {
                questionBank.Id,
                questionBank.Name,
                questionBank.Description,
                Subject = questionBank.Subject.ToString(),
                Tags = JsonSerializer.Deserialize<List<string>>(questionBank.Tags ?? "[]"),
                questionBank.IsActive,
                questionBank.CreatedAt,
                questionBank.UpdatedAt,
                CreatedBy = questionBank.Creator.Name,
                TotalQuestions = questionBank.Questions.Count,
                ActiveQuestions = questionBank.Questions.Count(q => q.Status == QuestionStatus.Active),
                DraftQuestions = questionBank.Questions.Count(q => q.Status == QuestionStatus.Draft)
            };

            return Ok(new { success = true, questionBank = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to fetch question bank", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestionBank([FromBody] CreateQuestionBankDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, message = "Invalid user token" });
            }

            var questionBank = new QuestionBank
            {
                Name = dto.Name,
                Description = dto.Description,
                Subject = dto.Subject,
                Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>()),
                IsActive = dto.IsActive,
                CreatedBy = userId
            };

            _context.QuestionBanks.Add(questionBank);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Question bank created successfully", questionBankId = questionBank.Id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to create question bank", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuestionBank(Guid id, [FromBody] UpdateQuestionBankDto dto)
    {
        try
        {
            var questionBank = await _context.QuestionBanks.FindAsync(id);
            if (questionBank == null)
            {
                return NotFound(new { success = false, message = "Question bank not found" });
            }

            questionBank.Name = dto.Name;
            questionBank.Description = dto.Description;
            questionBank.Subject = dto.Subject;
            questionBank.Tags = JsonSerializer.Serialize(dto.Tags ?? new List<string>());
            questionBank.IsActive = dto.IsActive;
            questionBank.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Question bank updated successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to update question bank", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuestionBank(Guid id)
    {
        try
        {
            var questionBank = await _context.QuestionBanks
                .Include(qb => qb.Questions)
                .FirstOrDefaultAsync(qb => qb.Id == id);

            if (questionBank == null)
            {
                return NotFound(new { success = false, message = "Question bank not found" });
            }

            // Check if question bank has questions
            if (questionBank.Questions.Any())
            {
                return BadRequest(new { success = false, message = "Cannot delete question bank that contains questions. Please move or delete all questions first." });
            }

            _context.QuestionBanks.Remove(questionBank);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Question bank deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to delete question bank", error = ex.Message });
        }
    }
}

public class CreateQuestionBankDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public SubjectType Subject { get; set; }
    public List<string>? Tags { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateQuestionBankDto : CreateQuestionBankDto
{
}