using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    public string? Password { get; set; }
    
    public string? GoogleId { get; set; }
    
    public UserRole Role { get; set; } = UserRole.Student;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
    
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
}

public enum UserRole
{
    Student,
    Tutor,
    Admin
}