using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class PracticeSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    [Required]
    public string Subject { get; set; } = string.Empty; // Math, Reading, Writing
    
    public string? Domain { get; set; } // Algebra, Geometry, etc.
    
    public string? Unit { get; set; } // Linear equations, etc.
    
    [Required]
    public PracticeMode Mode { get; set; } = PracticeMode.Tutor;
    
    [Required]
    public DifficultyLevel Difficulty { get; set; }
    
    public PracticeStatus Status { get; set; } = PracticeStatus.InProgress;
    
    public int TotalQuestions { get; set; }
    
    public int CompletedQuestions { get; set; } = 0;
    
    public int CorrectAnswers { get; set; } = 0;
    
    public int IncorrectAnswers { get; set; } = 0;
    
    public int SkippedQuestions { get; set; } = 0;
    
    public double AccuracyPercentage { get; set; } = 0;
    
    public int TotalTimeSpent { get; set; } = 0; // in seconds
    
    public int Score { get; set; } = 0; // Percentage score (0-100)
    
    public int? TimeLimit { get; set; } // in seconds, null for untimed
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? CompletedAt { get; set; }
    
    public DateTime? LastActivityAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<PracticeAnswer> Answers { get; set; } = new List<PracticeAnswer>();
    
    // Computed properties
    public bool IsCompleted => Status == PracticeStatus.Completed;
    public bool IsTimedOut => TimeLimit.HasValue && TotalTimeSpent >= TimeLimit.Value;
    public double ProgressPercentage => TotalQuestions > 0 ? (double)CompletedQuestions / TotalQuestions * 100 : 0;
}

public enum PracticeMode
{
    Tutor = 1,    // Show immediate feedback
    Timed = 2,    // No feedback until end
    Review = 3,   // Review previous session
    Mock = 4      // Mock test mode without time limits
}

public enum PracticeStatus
{
    InProgress = 1,
    Completed = 2,
    Paused = 3,
    Abandoned = 4,
    TimedOut = 5
}