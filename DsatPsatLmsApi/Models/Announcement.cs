using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class Announcement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public AnnouncementType Type { get; set; }
    
    public string? TargetAudience { get; set; } // JSON array of user IDs or "all"
    
    public bool IsUrgent { get; set; } = false;
    
    public DateTime? ScheduledAt { get; set; }
    
    public bool IsSent { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid CreatedBy { get; set; }
    
    public User Creator { get; set; } = null!;
}

public enum AnnouncementType
{
    General = 1,
    Academic = 2,
    Technical = 3,
    Emergency = 4
}