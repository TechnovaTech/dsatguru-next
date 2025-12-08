using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class UserResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    [Required]
    public Guid QuestionId { get; set; }
    public Question Question { get; set; } = null!;
    
    [Required]
    public string SelectedOption { get; set; } = string.Empty;
    
    public bool IsCorrect { get; set; }
    
    public int TimeSpent { get; set; } // in seconds
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Admin feedback fields
    public string? AdminFeedback { get; set; }
    
    public Guid? ReviewedBy { get; set; }
    public User? Reviewer { get; set; }
    
    public DateTime? ReviewedAt { get; set; }
    
    // Test session reference
    public Guid? TestSessionId { get; set; }
    public TestSession? TestSession { get; set; }
    
    // Additional metadata
    public string? ModuleType { get; set; } // "Base" or "Adaptive"
    public string? Subject { get; set; } // "Math" or "Reading & Writing"
}