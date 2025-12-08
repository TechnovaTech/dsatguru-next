using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class UserQuestionStats
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    [Required]
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    
    // Attempt statistics
    public int TotalAttempts { get; set; } = 0;
    
    public int CorrectAttempts { get; set; } = 0;
    
    public int IncorrectAttempts { get; set; } = 0;
    
    public int SkippedAttempts { get; set; } = 0;
    
    public double AccuracyRate { get; set; } = 0; // Percentage of correct attempts
    
    // Timing statistics
    public int TotalTimeSpent { get; set; } = 0; // in seconds
    
    public int AverageTimePerAttempt { get; set; } = 0; // in seconds
    
    public int FastestTime { get; set; } = 0; // in seconds
    
    public int SlowestTime { get; set; } = 0; // in seconds
    
    // Learning progress
    public QuestionMasteryLevel MasteryLevel { get; set; } = QuestionMasteryLevel.NotAttempted;
    
    public int ConsecutiveCorrect { get; set; } = 0;
    
    public int ConsecutiveIncorrect { get; set; } = 0;
    
    public bool IsMarkedForReview { get; set; } = false;
    
    public bool IsBookmarked { get; set; } = false;
    
    // Confidence and difficulty perception
    public double AverageConfidence { get; set; } = 0; // 1-5 scale
    
    public double AveragePerceivedDifficulty { get; set; } = 0; // 1-5 scale
    
    // Timestamps
    public DateTime FirstAttemptAt { get; set; } = DateTime.UtcNow;
    
    public DateTime LastAttemptAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastCorrectAt { get; set; }
    
    public DateTime? LastIncorrectAt { get; set; }
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Learning analytics
    public int DaysToMaster { get; set; } = 0; // Days between first attempt and mastery
    
    public bool HasViewedExplanation { get; set; } = false;
    
    public int ExplanationViews { get; set; } = 0;
    
    // Performance trends
    public bool IsImproving { get; set; } = false; // Based on recent attempts
    
    public bool NeedsReview { get; set; } = false; // Algorithm-determined review need
    
    public DateTime? NextReviewDate { get; set; } // Spaced repetition scheduling
}

public enum QuestionMasteryLevel
{
    NotAttempted = 0,
    Struggling = 1,     // < 40% accuracy
    Learning = 2,       // 40-70% accuracy
    Proficient = 3,     // 70-90% accuracy
    Mastered = 4        // > 90% accuracy with consistent performance
}