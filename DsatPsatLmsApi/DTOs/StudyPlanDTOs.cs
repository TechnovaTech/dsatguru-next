using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.DTOs
{
    public class StudyPlanModuleDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public ModuleDifficultyType Type { get; set; }
        public string Description { get; set; }
        public int OrderIndex { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<PerformanceRoutingDto> RoutingRules { get; set; } = new List<PerformanceRoutingDto>();
    }
    
    public class CreateStudyPlanModuleDto
    {
        [Required]
        public string Title { get; set; }
        
        [Required]
        public ModuleDifficultyType Type { get; set; }
        
        public string Description { get; set; }
        
        public int OrderIndex { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
    
    public class UpdateStudyPlanModuleDto
    {
        public string Title { get; set; }
        public ModuleDifficultyType? Type { get; set; }
        public string Description { get; set; }
        public int? OrderIndex { get; set; }
        public bool? IsActive { get; set; }
    }
    
    public class StudyPlanModuleProgressDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ModuleId { get; set; }
        public string ModuleTitle { get; set; }
        public ModuleDifficultyType ModuleType { get; set; }
        public ModuleStatus Status { get; set; }
        public decimal ProgressPercentage { get; set; }
        public int? Score { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    
    public class UserStudyPlanDto
    {
        public Guid UserId { get; set; }
        public List<StudyPlanModuleProgressDto> Modules { get; set; } = new List<StudyPlanModuleProgressDto>();
        public StudyPlanModuleProgressDto CurrentModule { get; set; }
        public StudyPlanModuleProgressDto NextModule { get; set; }
    }
    
    public class PerformanceRoutingDto
    {
        public Guid Id { get; set; }
        public Guid FromModuleId { get; set; }
        public string FromModuleTitle { get; set; }
        public Guid ToModuleId { get; set; }
        public string ToModuleTitle { get; set; }
        public int MinScore { get; set; }
        public int MaxScore { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    
    public class CreatePerformanceRoutingDto
    {
        [Required]
        public Guid FromModuleId { get; set; }
        
        [Required]
        public Guid ToModuleId { get; set; }
        
        [Required]
        [Range(0, 100)]
        public int MinScore { get; set; }
        
        [Required]
        [Range(0, 100)]
        public int MaxScore { get; set; }
        
        public string Description { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
    
    public class UpdateModuleProgressDto
    {
        public ModuleStatus? Status { get; set; }
        public decimal? ProgressPercentage { get; set; }
        public int? Score { get; set; }
    }
}