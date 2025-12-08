using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class Course
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Overview { get; set; }
    public string? CourseDetails { get; set; }
    public string? BannerImageUrl { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripePriceId { get; set; }
    public string Type { get; set; } = "course"; // Default type is course
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<CourseHighlight> Highlights { get; set; } = new List<CourseHighlight>();
    public ICollection<CourseSchedule> Schedules { get; set; } = new List<CourseSchedule>();
    public ICollection<CourseFAQ> FAQs { get; set; } = new List<CourseFAQ>();
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
    public ICollection<ZoomSession> ZoomSessions { get; set; } = new List<ZoomSession>();
    public ICollection<LiveMeeting> LiveMeetings { get; set; } = new List<LiveMeeting>();
    public ICollection<StudyMaterial> StudyMaterials { get; set; } = new List<StudyMaterial>();
    public ICollection<SyllabusTopic> SyllabusTopics { get; set; } = new List<SyllabusTopic>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
}

public class CourseHighlight
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int SequenceOrder { get; set; }
    public Course Course { get; set; } = null!;
}

public class CourseSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public string Day { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public Course Course { get; set; } = null!;
    public ICollection<ZoomSession> ZoomSessions { get; set; } = new List<ZoomSession>();
}

public class CourseFAQ
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public Course Course { get; set; } = null!;
}

public class CourseEnrollment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class QuestionBankEnrollment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid QuestionBankId { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
    public Course QuestionBank { get; set; } = null!;
}

public class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Slug { get; set; } = string.Empty;
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Subtitle { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    public string? BannerUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ServicePackage> Packages { get; set; } = new List<ServicePackage>();
    public ICollection<ServiceHighlight> Highlights { get; set; } = new List<ServiceHighlight>();
}

public class ServicePackage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceId { get; set; }
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Label { get; set; } = string.Empty;
    public decimal Price { get; set; }
    [Required] public string Features { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsCustomPlan { get; set; }
    public Service Service { get; set; } = null!;
}

public class ServiceHighlight
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceId { get; set; }
    public ServiceHighlightType Type { get; set; }
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public Service Service { get; set; } = null!;
}

public enum ServiceHighlightType { Benefit, Testimonial, FeatureBadge }

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string PaymentGateway { get; set; } = "stripe";
    public string PaymentIntentId { get; set; } = string.Empty;
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? ReceiptUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
    public User User { get; set; } = null!;
    public CourseEnrollment Enrollment { get; set; } = null!;
}

public enum PaymentStatus { Pending, Succeeded, Failed, Refunded, Cancelled }

public class ContactMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Name { get; set; } = string.Empty;
    [Required] public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
    public string? SourcePage { get; set; }
    public bool Responded { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ZoomSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public Guid? ScheduleId { get; set; }
    [Required] public string ZoomLink { get; set; } = string.Empty;
    public string? MeetingId { get; set; }
    public string? Passcode { get; set; }
    public DateTime SessionDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsSent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Course Course { get; set; } = null!;
    public CourseSchedule? Schedule { get; set; }
}

public class AccessToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [Required] public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}

public class PasswordResetToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    [Required] public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}

public class StaticPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required] public string Slug { get; set; } = string.Empty;
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}