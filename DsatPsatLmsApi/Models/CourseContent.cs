using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class LiveMeeting
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public DateTime Date { get; set; }
    
    [Required]
    public string Time { get; set; } = string.Empty;
    
    public string ZoomLink { get; set; } = string.Empty;
    
    public string Status { get; set; } = "upcoming"; // upcoming, live, ended
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Course Course { get; set; } = null!;
}

public class StudyMaterial
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    
    [Required]
    public string Type { get; set; } = string.Empty; // pdf, video, slides
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Url { get; set; }
    public string? FileName { get; set; }
    
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Course Course { get; set; } = null!;
}

public class SyllabusTopic
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    
    [Required]
    public int Week { get; set; }
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    public string? Materials { get; set; } // Comma-separated list
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Course Course { get; set; } = null!;
}

public class Assignment
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Required]
    public DateTime DueDate { get; set; }
    
    public string Status { get; set; } = "draft"; // draft, active, closed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Course Course { get; set; } = null!;
}