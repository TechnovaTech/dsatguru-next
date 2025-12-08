using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class EnhancedQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public string? Explanation { get; set; }
    
    [Required]
    public string Topic { get; set; } = string.Empty;
    
    public string? Subtopic { get; set; }
    
    [Required]
    public DifficultyLevel Difficulty { get; set; }
    
    [Required]
    public QuestionType Type { get; set; }
    
    [Required]
    public SubjectType Subject { get; set; }
    
    public string? CorrectAnswer { get; set; }
    
    public string? Options { get; set; } // JSON array for MCQ
    
    public int Points { get; set; } = 1;
    
    public QuestionStatus Status { get; set; } = QuestionStatus.Draft;
    
    public string? ImageUrl { get; set; }
    
    public string? Tags { get; set; } // JSON array of tags
    
    public int UsageCount { get; set; } = 0;
    
    public decimal AverageRating { get; set; } = 0;
    
    public int TotalRatings { get; set; } = 0;
    
    public decimal SuccessRate { get; set; } = 0;
    
    public int AverageTimeSeconds { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid CreatedBy { get; set; }
    
    public User Creator { get; set; } = null!;
    
    // Question Bank relationship
    public Guid? QuestionBankId { get; set; }
    
    public QuestionBank? QuestionBank { get; set; }
    
    public ICollection<QuestionAttempt> Attempts { get; set; } = new List<QuestionAttempt>();
    
    public ICollection<QuestionRating> Ratings { get; set; } = new List<QuestionRating>();
}

public enum SubjectType
{
    Math = 1,
    Verbal = 2,
    Reading = 3,
    Writing = 4,
    Science = 5
}

public enum QuestionStatus
{
    Draft = 1,
    Active = 2,
    Archived = 3,
    UnderReview = 4
}

public class QuestionAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuestionId { get; set; }
    public EnhancedQuestion Question { get; set; } = null!;
    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;
    public string? StudentAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public int TimeSpentSeconds { get; set; }
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
}

public class QuestionRating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuestionId { get; set; }
    public EnhancedQuestion Question { get; set; } = null!;
    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;
    public int Rating { get; set; } // 1-5 stars
    public string? Feedback { get; set; }
    public DateTime RatedAt { get; set; } = DateTime.UtcNow;
}