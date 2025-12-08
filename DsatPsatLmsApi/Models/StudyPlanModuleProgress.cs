using System;
using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models
{
    public class StudyPlanModuleProgress
    {
        public Guid Id { get; set; }
        
        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }
        
        [Required]
        public Guid ModuleId { get; set; }
        public StudyPlanModule Module { get; set; }
        
        public ModuleStatus Status { get; set; } = ModuleStatus.Locked;
        
        public decimal ProgressPercentage { get; set; } = 0;
        
        public int? Score { get; set; }
        
        public DateTime? StartedAt { get; set; }
        
        public DateTime? CompletedAt { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    public enum ModuleStatus
    {
        Locked,
        Unlocked,
        InProgress,
        Completed
    }
}