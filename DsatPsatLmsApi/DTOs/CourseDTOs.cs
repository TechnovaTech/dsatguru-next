using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.DTOs;

public class CreateCourseDto
{
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    public string? Overview { get; set; }
    public string? CourseDetails { get; set; }
    public string? BannerImageUrl { get; set; }
    
    public string Type { get; set; } = "course";
    
    [Required]
    public decimal Price { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripePriceId { get; set; }
    public List<string> Highlights { get; set; } = new();
    public List<CreateCourseScheduleDto> Schedules { get; set; } = new();
    public List<CreateCourseFAQDto> FAQs { get; set; } = new();
}

public class CreateCourseHighlightDto
{
    [Required] public string Text { get; set; } = string.Empty;
}

public class CreateCourseScheduleDto
{
    [Required] public string Day { get; set; } = string.Empty;
    [Required] public string Time { get; set; } = string.Empty;
}

public class CreateCourseFAQDto
{
    [Required] public string Question { get; set; } = string.Empty;
    [Required] public string Answer { get; set; } = string.Empty;
}

public class UpdateCourseDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Overview { get; set; }
    public string? CourseDetails { get; set; }
    public string? BannerImageUrl { get; set; }
    public string? Type { get; set; }
    public decimal? Price { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripePriceId { get; set; }
    public List<string>? Highlights { get; set; }
    public List<CreateCourseScheduleDto>? Schedules { get; set; }
    public List<CreateCourseFAQDto>? FAQs { get; set; }
}

public class CourseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Overview { get; set; }
    public string? CourseDetails { get; set; }
    public string? BannerImageUrl { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripePriceId { get; set; }
    public string Type { get; set; } = "course";
    public DateTime CreatedAt { get; set; }
    public List<CourseHighlightDto> Highlights { get; set; } = new();
    public List<CourseScheduleDto> Schedules { get; set; } = new();
    public List<CourseFAQDto> FAQs { get; set; } = new();
}

public class CourseHighlightDto
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public int SequenceOrder { get; set; }
}

public class CourseScheduleDto
{
    public Guid Id { get; set; }
    public string Day { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class CourseFAQDto
{
    public Guid Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}