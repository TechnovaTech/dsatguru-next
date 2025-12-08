using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class ClassType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    public int DefaultDurationMinutes { get; set; } = 60;
    
    public int MaxCapacity { get; set; } = 50;
    
    public decimal Price { get; set; } = 0;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<EnhancedLiveClass> Classes { get; set; } = new List<EnhancedLiveClass>();
}

public class EnhancedLiveClass
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    public Guid ClassTypeId { get; set; }
    
    public ClassType ClassType { get; set; } = null!;
    
    [Required]
    public DateTime StartTime { get; set; }
    
    [Required]
    public DateTime EndTime { get; set; }
    
    public Guid InstructorId { get; set; }
    
    public User Instructor { get; set; } = null!;
    
    public int MaxStudents { get; set; } = 50;
    
    public ClassStatus Status { get; set; } = ClassStatus.Scheduled;
    
    public string? ZoomMeetingId { get; set; }
    
    public string? ZoomJoinUrl { get; set; }
    
    public string? ZoomPassword { get; set; }
    
    public string? GoogleMeetUrl { get; set; }
    
    public string? RecordingUrl { get; set; }
    
    public bool IsRecurring { get; set; } = false;
    
    public string? RecurrenceRule { get; set; } // JSON for recurrence pattern
    
    public Guid? ParentClassId { get; set; } // For recurring classes
    
    public EnhancedLiveClass? ParentClass { get; set; }
    
    public string? Resources { get; set; } // JSON array of resource URLs
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<ClassEnrollment> Enrollments { get; set; } = new List<ClassEnrollment>();
    
    public ICollection<ClassAttendance> Attendances { get; set; } = new List<ClassAttendance>();
    
    public ICollection<ClassFeedback> Feedbacks { get; set; } = new List<ClassFeedback>();
    
    public ICollection<ClassMessage> Messages { get; set; } = new List<ClassMessage>();
    
    public ICollection<EnhancedLiveClass> RecurringClasses { get; set; } = new List<EnhancedLiveClass>();
}

public class ClassEnrollment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClassId { get; set; }
    
    public EnhancedLiveClass Class { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    
    public User Student { get; set; } = null!;
    
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Enrolled;
    
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    
    public int WaitlistPosition { get; set; } = 0;
}

public class ClassAttendance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClassId { get; set; }
    
    public EnhancedLiveClass Class { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    
    public User Student { get; set; } = null!;
    
    public DateTime? JoinedAt { get; set; }
    
    public DateTime? LeftAt { get; set; }
    
    public int TotalMinutesAttended { get; set; } = 0;
    
    public bool IsPresent { get; set; } = false;
    
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
}

public class ClassFeedback
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClassId { get; set; }
    
    public EnhancedLiveClass Class { get; set; } = null!;
    
    public Guid StudentId { get; set; }
    
    public User Student { get; set; } = null!;
    
    public int Rating { get; set; } // 1-5 stars
    
    public string? Comments { get; set; }
    
    public int ContentRating { get; set; } = 0;
    
    public int InstructorRating { get; set; } = 0;
    
    public int TechnicalRating { get; set; } = 0;
    
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

public class ClassMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ClassId { get; set; }
    
    public EnhancedLiveClass Class { get; set; } = null!;
    
    public Guid SenderId { get; set; }
    
    public User Sender { get; set; } = null!;
    
    public string Message { get; set; } = string.Empty;
    
    public MessageType Type { get; set; } = MessageType.Chat;
    
    public bool IsQuestion { get; set; } = false;
    
    public bool IsAnswered { get; set; } = false;
    
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}

public enum ClassStatus
{
    Scheduled = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Postponed = 5
}

public enum EnrollmentStatus
{
    Enrolled = 1,
    Waitlisted = 2,
    Cancelled = 3,
    Completed = 4
}

public enum AttendanceStatus
{
    Present = 1,
    Absent = 2,
    Late = 3,
    LeftEarly = 4
}

public enum MessageType
{
    Chat = 1,
    Question = 2,
    Announcement = 3,
    Poll = 4
}