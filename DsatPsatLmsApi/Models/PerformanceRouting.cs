using System;
using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models
{
    public class PerformanceRouting
    {
        public Guid Id { get; set; }
        
        [Required]
        public Guid FromModuleId { get; set; }
        public StudyPlanModule FromModule { get; set; }
        
        [Required]
        public Guid ToModuleId { get; set; }
        public StudyPlanModule ToModule { get; set; }
        
        [Required]
        public int MinScore { get; set; }
        
        [Required]
        public int MaxScore { get; set; }
        
        public string Description { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}