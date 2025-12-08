using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class QuestionBank
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Required]
    public SubjectType Subject { get; set; }
    
    public string? Tags { get; set; } // JSON array of tags
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid CreatedBy { get; set; }
    
    public User Creator { get; set; } = null!;
    
    // Navigation properties
    public ICollection<EnhancedQuestion> Questions { get; set; } = new List<EnhancedQuestion>();
    
    // Statistics (computed properties)
    public int TotalQuestions => Questions?.Count ?? 0;
    public int ActiveQuestions => Questions?.Count(q => q.Status == QuestionStatus.Active) ?? 0;
    public int DraftQuestions => Questions?.Count(q => q.Status == QuestionStatus.Draft) ?? 0;
}