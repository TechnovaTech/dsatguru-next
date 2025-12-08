using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class CalendarEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Required]
    public DateTime StartTime { get; set; }
    
    [Required]
    public DateTime EndTime { get; set; }
    
    public EventType Type { get; set; }
    
    public string? Location { get; set; }
    
    public Guid CreatedBy { get; set; }
    
    public User Creator { get; set; } = null!;
    
    public string? GoogleEventId { get; set; }
    
    public bool IsRecurring { get; set; } = false;
    
    public string? RecurrenceRule { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum EventType
{
    Class = 1,
    Meeting = 2,
    Exam = 3,
    Holiday = 4,
    Other = 5
}