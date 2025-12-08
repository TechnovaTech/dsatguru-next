using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class TestAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public Guid AdaptiveConfigId { get; set; }
    public AdaptiveConfig AdaptiveConfig { get; set; } = null!;
    
    // Test session references
    public Guid? BaseTestSessionId { get; set; }
    public TestSession? BaseTestSession { get; set; }
    
    public Guid? Adaptive1SessionId { get; set; }
    public TestSession? Adaptive1Session { get; set; }
    
    public Guid? Adaptive2SessionId { get; set; }
    public TestSession? Adaptive2Session { get; set; }
    
    // Progress tracking
    public TestAttemptStatus Status { get; set; } = TestAttemptStatus.NotStarted;
    public AdaptiveLevel CurrentLevel { get; set; } = AdaptiveLevel.Base;
    public AdaptiveLevel? RoutedLevel { get; set; } // Level routed to after base test
    
    // Scores and performance
    public int? BaseTestScore { get; set; }
    public double? BaseTestPercentage { get; set; }
    
    public int? Adaptive1Score { get; set; }
    public double? Adaptive1Percentage { get; set; }
    
    public int? Adaptive2Score { get; set; }
    public double? Adaptive2Percentage { get; set; }
    
    // Final calculated scores
    public int? FinalMathScore { get; set; }
    public int? FinalReadingWritingScore { get; set; }
    public int? FinalTotalScore { get; set; }
    public double? FinalScore { get; set; } // Overall weighted final score
    
    // Timing
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int? TotalTimeSpent { get; set; } // in minutes
    
    // Attempt tracking
    public int AttemptNumber { get; set; } = 1;
    public bool IsRetake { get; set; } = false;
    
    // Study plan generation flag
    public bool StudyPlanGenerated { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum TestAttemptStatus
{
    NotStarted = 0,
    BaseTestInProgress = 1,
    BaseTestCompleted = 2,
    Adaptive1InProgress = 3,
    Adaptive1Completed = 4,
    Adaptive2InProgress = 5,
    Adaptive2Completed = 6,
    Completed = 7,
    Abandoned = 8
}

public enum AdaptiveLevel
{
    Base = 0,
    Low = 1,
    Medium = 2,
    High = 3
}