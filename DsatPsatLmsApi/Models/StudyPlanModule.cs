using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models
{
    public class StudyPlanModule
    {
        public Guid Id { get; set; }
        
        [Required]
        public string Title { get; set; }
        
        [Required]
        public ModuleDifficultyType Type { get; set; }
        
        public string Description { get; set; }
        

        
        public int OrderIndex { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public List<StudyPlanModuleProgress> UserProgress { get; set; } = new List<StudyPlanModuleProgress>();
        public List<PerformanceRouting> RoutingRules { get; set; } = new List<PerformanceRouting>();
    }
    
    public enum ModuleDifficultyType
    {
        Base,
        Easy,
        Medium,
        Hard
    }
}