using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.DTOs;

public class CreateServiceDto
{
    [Required] public string Slug { get; set; } = string.Empty;
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Subtitle { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    [Required] public string PhoneNumber { get; set; } = string.Empty;
    public string? BannerUrl { get; set; }
}

public class UpdateServiceDto
{
    public string? Slug { get; set; }
    public string? Title { get; set; }
    public string? Subtitle { get; set; }
    public string? Description { get; set; }
    public string? PhoneNumber { get; set; }
    public string? BannerUrl { get; set; }
}

public class ServiceDto
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? BannerUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ServicePackageDto> Packages { get; set; } = new();
    public List<ServiceHighlightDto> Highlights { get; set; } = new();
}

public class CreateServicePackageDto
{
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Label { get; set; } = string.Empty;
    public decimal Price { get; set; }
    [Required] public string Features { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsCustomPlan { get; set; }
}

public class ServicePackageDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Features { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsCustomPlan { get; set; }
}

public class CreateServiceHighlightDto
{
    public string Type { get; set; } = string.Empty;
    [Required] public string Title { get; set; } = string.Empty;
    [Required] public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class ServiceHighlightDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class CreateContactMessageDto
{
    [Required] public string Name { get; set; } = string.Empty;
    [Required] [EmailAddress] public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
    public string? SourcePage { get; set; }
}

public class ContactMessageDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Subject { get; set; }
    public string? Message { get; set; }
    public string? SourcePage { get; set; }
    public bool Responded { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateZoomSessionDto
{
    [Required] public string ZoomLink { get; set; } = string.Empty;
    public string? MeetingId { get; set; }
    public string? Passcode { get; set; }
    public DateTime SessionDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}

public class ZoomSessionDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Guid? ScheduleId { get; set; }
    public string ZoomLink { get; set; } = string.Empty;
    public string? MeetingId { get; set; }
    public string? Passcode { get; set; }
    public DateTime SessionDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsSent { get; set; }
}

public class CreatePaymentDto
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    [Required] public string PaymentIntentId { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? ReceiptUrl { get; set; }
}

public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string PaymentGateway { get; set; } = string.Empty;
    public string PaymentIntentId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ReceiptUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateEnrollmentDto
{
    public Guid CourseId { get; set; }
    public Guid? ScheduleId { get; set; }
}

public class EnrollmentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public DateTime EnrolledAt { get; set; }
    public CourseDto? Course { get; set; }
}

public class CreateSessionDto
{
    [Required]
    public Guid CourseId { get; set; }
    public Guid? ScheduleId { get; set; }
    [Required]
    public string SuccessUrl { get; set; } = string.Empty;
    [Required]
    public string CancelUrl { get; set; } = string.Empty;
}

public class ConfirmSessionDto
{
    [Required] public string SessionId { get; set; } = string.Empty;
}