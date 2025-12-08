using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class StudentProgress
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid StudentId { get; set; }
    
    public User Student { get; set; } = null!;
    
    public Guid CourseId { get; set; }
    
    public Course Course { get; set; } = null!;
    
    public int CompletedLessons { get; set; }
    
    public int TotalLessons { get; set; }
    
    public decimal ProgressPercentage { get; set; }
    
    public int QuizzesTaken { get; set; }
    
    public decimal AverageScore { get; set; }
    
    public DateTime LastActivity { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TutorPerformance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid TutorId { get; set; }
    
    public User Tutor { get; set; } = null!;
    
    public int TotalClasses { get; set; }
    
    public int StudentsEnrolled { get; set; }
    
    public decimal AverageRating { get; set; }
    
    public int TotalReviews { get; set; }
    
    public decimal Revenue { get; set; }
    
    public DateTime PeriodStart { get; set; }
    
    public DateTime PeriodEnd { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}