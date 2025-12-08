using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string Title { get; set; } = string.Empty;
    
    public string? QuestionParagraph { get; set; }
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public string? Explanation { get; set; }
    
    [Required]
    public string Subject { get; set; } = "Math";
    
    [Required]
    public DifficultyLevel Difficulty { get; set; }
    
    [Required]
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    
    [Required]
    public TestType TestType { get; set; } = TestType.Base;
    
    [Required]
    public string CorrectAnswer { get; set; } = "A";
    
    public string? ImageUrl { get; set; }
    
    public string? Options { get; set; } // JSON array for MCQ
    
    public string? Tags { get; set; } // JSON array of tags
    
    public int Points { get; set; } = 1;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid CreatedBy { get; set; }
    
    public User Creator { get; set; } = null!;
    
    // Foreign key to Course (acting as Question Bank)
    public Guid? QuestionBankId { get; set; }
    
    // Navigation property to Course (Question Bank)
    public Course? QuestionBank { get; set; }

}

public enum DifficultyLevel
{
    Easy = 1,
    Medium = 2,
    Hard = 3
}

public enum TestType
{
    Base = 1,
    Adaptive = 2
}

public enum QuestionType
{
    MultipleChoice = 1,
    TrueFalse = 2,
    ShortAnswer = 3,
    Essay = 4
}