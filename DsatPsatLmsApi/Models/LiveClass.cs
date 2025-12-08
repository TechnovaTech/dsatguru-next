using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class LiveClass
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Required]
    public DateTime StartTime { get; set; }
    
    [Required]
    public DateTime EndTime { get; set; }
    
    public string? ZoomMeetingId { get; set; }
    
    public string? ZoomJoinUrl { get; set; }
    
    public string? ZoomPassword { get; set; }
    
    public Guid InstructorId { get; set; }
    
    public User Instructor { get; set; } = null!;
    
    public int MaxStudents { get; set; } = 50;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<LiveClassAttendance> Attendances { get; set; } = new List<LiveClassAttendance>();
}

public class LiveClassAttendance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid LiveClassId { get; set; }
    
    public LiveClass LiveClass { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    
    public User Student { get; set; } = null!;
    
    public DateTime JoinedAt { get; set; }
    
    public DateTime? LeftAt { get; set; }
    
    public bool IsPresent { get; set; } = true;
}