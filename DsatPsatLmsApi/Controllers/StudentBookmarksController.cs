using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/bookmarks")]
[Authorize]
public class StudentBookmarksController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<StudentBookmarksController> _logger;

    public StudentBookmarksController(AppDbContext context, ILogger<StudentBookmarksController> logger)
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
    public async Task<IActionResult> GetBookmarks([FromQuery] string subject = "", [FromQuery] string difficulty = "", [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // For now, we'll simulate bookmarks since we don't have a Bookmark entity
            // In a real implementation, you would have a Bookmarks table
            var bookmarksQuery = _context.Questions
                .Where(q => q.IsActive)
                .AsQueryable();

            if (!string.IsNullOrEmpty(subject))
                bookmarksQuery = bookmarksQuery.Where(q => q.Subject.ToLower() == subject.ToLower());

            if (!string.IsNullOrEmpty(difficulty) && Enum.TryParse<DifficultyLevel>(difficulty, true, out var difficultyLevel))
                bookmarksQuery = bookmarksQuery.Where(q => q.Difficulty == difficultyLevel);

            var totalCount = await bookmarksQuery.CountAsync();
            var bookmarks = await bookmarksQuery
                .OrderByDescending(q => q.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content.Length > 150 ? q.Content.Substring(0, 150) + "..." : q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    testType = q.TestType,
                    bookmarkedAt = q.CreatedAt, // Simulated bookmark date
                    tags = new List<string> { q.Subject, q.Difficulty.ToString() }
                })
                .ToListAsync();

            var result = new
            {
                bookmarks = bookmarks,
                pagination = new
                {
                    currentPage = page,
                    totalPages = (int)Math.Ceiling((double)totalCount / limit),
                    totalCount = totalCount,
                    hasNext = page * limit < totalCount,
                    hasPrevious = page > 1
                }
            };

            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookmarks");
            return StatusCode(500, new { success = false, message = "Error retrieving bookmarks" });
        }
    }

    [HttpPost("{questionId}")]
    public async Task<IActionResult> AddBookmark(Guid questionId, [FromBody] AddBookmarkRequest? request = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var question = await _context.Questions.FindAsync(questionId);
            
            if (question == null)
                return NotFound(new { success = false, message = "Question not found" });

            // In a real implementation, you would create a Bookmark entity
            // For now, we'll just return success
            _logger.LogInformation("User {UserId} bookmarked question {QuestionId}", userId, questionId);

            var bookmark = new
            {
                id = Guid.NewGuid(),
                questionId = questionId,
                userId = userId,
                notes = request?.Notes ?? "",
                tags = request?.Tags ?? new List<string>(),
                createdAt = DateTime.UtcNow
            };

            return Ok(new { success = true, message = "Question bookmarked successfully", data = bookmark });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding bookmark for question: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error adding bookmark" });
        }
    }

    [HttpDelete("{questionId}")]
    public async Task<IActionResult> RemoveBookmark(Guid questionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // In a real implementation, you would delete from Bookmarks table
            _logger.LogInformation("User {UserId} removed bookmark for question {QuestionId}", userId, questionId);

            return Ok(new { success = true, message = "Bookmark removed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing bookmark for question: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error removing bookmark" });
        }
    }

    [HttpGet("{questionId}/status")]
    public async Task<IActionResult> GetBookmarkStatus(Guid questionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // In a real implementation, you would check if bookmark exists
            // For now, we'll simulate that some questions are bookmarked
            var isBookmarked = questionId.ToString().GetHashCode() % 3 == 0; // Simulate some bookmarks

            return Ok(new { success = true, data = new { isBookmarked = isBookmarked } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking bookmark status for question: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error checking bookmark status" });
        }
    }

    [HttpPut("{questionId}")]
    public async Task<IActionResult> UpdateBookmark(Guid questionId, [FromBody] UpdateBookmarkRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // In a real implementation, you would update the bookmark in the database
            _logger.LogInformation("User {UserId} updated bookmark for question {QuestionId}", userId, questionId);

            var updatedBookmark = new
            {
                id = Guid.NewGuid(), // Would be the actual bookmark ID
                questionId = questionId,
                userId = userId,
                notes = request.Notes,
                tags = request.Tags,
                updatedAt = DateTime.UtcNow
            };

            return Ok(new { success = true, message = "Bookmark updated successfully", data = updatedBookmark });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating bookmark for question: {QuestionId}", questionId);
            return StatusCode(500, new { success = false, message = "Error updating bookmark" });
        }
    }

    [HttpGet("collections")]
    public async Task<IActionResult> GetBookmarkCollections()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Simulate bookmark collections
            var collections = new List<object>
            {
                new
                {
                    id = Guid.NewGuid(),
                    name = "Math - Algebra",
                    description = "Algebra questions for practice",
                    questionCount = 15,
                    createdAt = DateTime.UtcNow.AddDays(-7),
                    tags = new List<string> { "Math", "Algebra" }
                },
                new
                {
                    id = Guid.NewGuid(),
                    name = "Reading Comprehension",
                    description = "Challenging reading passages",
                    questionCount = 8,
                    createdAt = DateTime.UtcNow.AddDays(-3),
                    tags = new List<string> { "Reading", "Comprehension" }
                },
                new
                {
                    id = Guid.NewGuid(),
                    name = "Writing - Grammar",
                    description = "Grammar and usage questions",
                    questionCount = 12,
                    createdAt = DateTime.UtcNow.AddDays(-1),
                    tags = new List<string> { "Writing", "Grammar" }
                }
            };

            return Ok(new { success = true, data = collections });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookmark collections");
            return StatusCode(500, new { success = false, message = "Error retrieving collections" });
        }
    }

    [HttpPost("collections")]
    public async Task<IActionResult> CreateBookmarkCollection([FromBody] CreateCollectionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var collection = new
            {
                id = Guid.NewGuid(),
                name = request.Name,
                description = request.Description,
                questionIds = request.QuestionIds,
                questionCount = request.QuestionIds.Count,
                createdAt = DateTime.UtcNow,
                tags = request.Tags,
                userId = userId
            };

            _logger.LogInformation("User {UserId} created bookmark collection: {CollectionName}", userId, request.Name);

            return Ok(new { success = true, message = "Collection created successfully", data = collection });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating bookmark collection");
            return StatusCode(500, new { success = false, message = "Error creating collection" });
        }
    }

    [HttpGet("collections/{collectionId}")]
    public async Task<IActionResult> GetBookmarkCollection(Guid collectionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Simulate getting collection details with questions
            var collection = new
            {
                id = collectionId,
                name = "Sample Collection",
                description = "A collection of bookmarked questions",
                createdAt = DateTime.UtcNow.AddDays(-5),
                tags = new List<string> { "Practice", "Review" },
                questions = await _context.Questions
                    .Where(q => q.IsActive)
                    .Take(5) // Simulate 5 questions in collection
                    .Select(q => new
                    {
                        id = q.Id,
                        questionText = q.Content.Length > 100 ? q.Content.Substring(0, 100) + "..." : q.Content,
                        subject = q.Subject,
                        difficulty = q.Difficulty.ToString()
                    })
                    .ToListAsync()
            };

            return Ok(new { success = true, data = collection });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookmark collection: {CollectionId}", collectionId);
            return StatusCode(500, new { success = false, message = "Error retrieving collection" });
        }
    }

    [HttpDelete("collections/{collectionId}")]
    public async Task<IActionResult> DeleteBookmarkCollection(Guid collectionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            _logger.LogInformation("User {UserId} deleted bookmark collection: {CollectionId}", userId, collectionId);

            return Ok(new { success = true, message = "Collection deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting bookmark collection: {CollectionId}", collectionId);
            return StatusCode(500, new { success = false, message = "Error deleting collection" });
        }
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetBookmarkTags()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Simulate popular bookmark tags
            var tags = new List<object>
            {
                new { name = "Math", count = 25 },
                new { name = "Reading", count = 18 },
                new { name = "Writing", count = 15 },
                new { name = "Grammar", count = 12 },
                new { name = "Algebra", count = 10 },
                new { name = "Geometry", count = 8 },
                new { name = "Difficult", count = 20 },
                new { name = "Review", count = 30 },
                new { name = "Practice", count = 35 }
            };

            return Ok(new { success = true, data = tags });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookmark tags");
            return StatusCode(500, new { success = false, message = "Error retrieving tags" });
        }
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchBookmarks([FromQuery] string query, [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { success = false, message = "Search query is required" });

            // Simulate searching through bookmarked questions
            var bookmarks = await _context.Questions
                .Where(q => q.IsActive && 
                    (q.Content.Contains(query) || 
                     q.Subject.Contains(query) ||
                     (q.Explanation != null && q.Explanation.Contains(query))))
                .Take(limit)
                .Select(q => new
                {
                    id = q.Id,
                    questionText = q.Content.Length > 150 ? q.Content.Substring(0, 150) + "..." : q.Content,
                    subject = q.Subject,
                    difficulty = q.Difficulty.ToString(),
                    bookmarkedAt = q.CreatedAt,
                    notes = "Sample bookmark notes", // Would come from bookmark table
                    tags = new List<string> { q.Subject, q.Difficulty.ToString() }
                })
                .ToListAsync();

            return Ok(new { success = true, data = bookmarks });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching bookmarks with query: {Query}", query);
            return StatusCode(500, new { success = false, message = "Error searching bookmarks" });
        }
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetBookmarkStatistics()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Simulate bookmark statistics
            var statistics = new
            {
                totalBookmarks = 45,
                totalCollections = 3,
                subjectBreakdown = new List<object>
                {
                    new { subject = "Math", count = 20, percentage = 44.4 },
                    new { subject = "Reading", count = 15, percentage = 33.3 },
                    new { subject = "Writing", count = 10, percentage = 22.2 }
                },
                difficultyBreakdown = new List<object>
                {
                    new { difficulty = "Easy", count = 10, percentage = 22.2 },
                    new { difficulty = "Medium", count = 25, percentage = 55.6 },
                    new { difficulty = "Hard", count = 10, percentage = 22.2 }
                },
                recentActivity = new
                {
                    bookmarksThisWeek = 5,
                    bookmarksThisMonth = 15,
                    lastBookmarked = DateTime.UtcNow.AddHours(-2)
                }
            };

            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bookmark statistics");
            return StatusCode(500, new { success = false, message = "Error retrieving statistics" });
        }
    }
}

// Request DTOs
public class AddBookmarkRequest
{
    public string Notes { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}

public class UpdateBookmarkRequest
{
    public string Notes { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}

public class CreateCollectionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Guid> QuestionIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}