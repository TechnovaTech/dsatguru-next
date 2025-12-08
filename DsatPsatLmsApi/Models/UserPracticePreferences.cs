using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class UserPracticePreferences
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public string? PreferredSubject { get; set; }
    public DifficultyLevel? PreferredDifficulty { get; set; }
    public PracticeMode PreferredMode { get; set; } = PracticeMode.Tutor;
    public int PreferredQuestionCount { get; set; } = 10;
    public string? PreferredDomains { get; set; } // JSON array of domains
    public string? PreferredStatus { get; set; } // unused, incorrect, correct, mastered
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}