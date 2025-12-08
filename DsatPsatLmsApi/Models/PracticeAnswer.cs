using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class PracticeAnswer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid PracticeSessionId { get; set; }
    public PracticeSession PracticeSession { get; set; } = null!;
    
    [Required]
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    
    public string? UserAnswer { get; set; } // User's selected answer
    
    public bool IsCorrect { get; set; }
    
    public bool IsSkipped { get; set; } = false;
    
    public int TimeSpent { get; set; } = 0; // in seconds
    
    public int QuestionOrder { get; set; } // Order in the practice session
    
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? FirstViewedAt { get; set; } // When question was first shown
    
    public int ViewCount { get; set; } = 0; // How many times user viewed this question
    
    public int AnswerChanges { get; set; } = 0; // How many times user changed their answer
    
    // Bookmarking and notes
    public bool IsBookmarked { get; set; } = false;
    
    public string? UserNotes { get; set; }
    
    // Confidence level (1-5 scale)
    public int? ConfidenceLevel { get; set; }
    
    // Difficulty perception (1-5 scale)
    public int? PerceivedDifficulty { get; set; }
    
    // Feedback and review
    public bool HasViewedExplanation { get; set; } = false;
    
    public DateTime? ExplanationViewedAt { get; set; }
    
    public bool IsMarkedForReview { get; set; } = false;
}