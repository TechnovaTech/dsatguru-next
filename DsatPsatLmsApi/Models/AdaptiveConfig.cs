using System.ComponentModel.DataAnnotations;

namespace DsatPsatLmsApi.Models;

public class AdaptiveConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string ConfigName { get; set; } = "Default";
    
    // Difficulty percentages for adaptive levels
    [Range(0, 100)]
    public int LowDifficultyPercentage { get; set; } = 60; // % of easy questions
    
    [Range(0, 100)]
    public int MediumDifficultyPercentage { get; set; } = 70; // % of medium questions
    
    [Range(0, 100)]
    public int HighDifficultyPercentage { get; set; } = 80; // % of hard questions
    
    // Timer durations per section (in minutes)
    public int BaseTestDuration { get; set; } = 60;
    public int Adaptive1Duration { get; set; } = 45;
    public int Adaptive2Duration { get; set; } = 45;
    
    // Retake settings
    public int MaxRetakeAttempts { get; set; } = 3;
    public int RetakeCooldownHours { get; set; } = 24;
    
    // Score thresholds for routing
    [Range(0, 100)]
    public int LowToMediumThreshold { get; set; } = 40; // % correct to go from Low to Medium
    
    [Range(0, 100)]
    public int MediumToHighThreshold { get; set; } = 70; // % correct to go from Medium to High
    
    // Question distribution for adaptive tests
    public int QuestionsPerAdaptiveTest { get; set; } = 20;
    
    // Scoring weights
    [Range(0, 100)]
    public int BaseTestWeight { get; set; } = 40; // % weight of base test
    
    [Range(0, 100)]
    public int AdaptiveTestWeight { get; set; } = 60; // % weight of adaptive tests
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid CreatedBy { get; set; }
    public User Creator { get; set; } = null!;
}