using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/admin/config")]
[Authorize(Roles = "Admin")]
public class AdminConfigController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminConfigController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("adaptive")]
    public async Task<IActionResult> GetAdaptiveConfig()
    {
        try
        {
            var config = await _context.AdaptiveConfigs
                .Include(c => c.Creator)
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
                .FirstOrDefaultAsync();

            if (config == null)
            {
                // Return default configuration if none exists
                return Ok(new
                {
                    Id = Guid.Empty,
                    ConfigName = "Default",
                    LowDifficultyPercentage = 60,
                    MediumDifficultyPercentage = 70,
                    HighDifficultyPercentage = 80,
                    BaseTestDuration = 60,
                    Adaptive1Duration = 45,
                    Adaptive2Duration = 45,
                    MaxRetakeAttempts = 3,
                    RetakeCooldownHours = 24,
                    LowToMediumThreshold = 40,
                    MediumToHighThreshold = 70,
                    QuestionsPerAdaptiveTest = 20,
                    BaseTestWeight = 40,
                    AdaptiveTestWeight = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            return Ok(new
            {
                config.Id,
                config.ConfigName,
                config.LowDifficultyPercentage,
                config.MediumDifficultyPercentage,
                config.HighDifficultyPercentage,
                config.BaseTestDuration,
                config.Adaptive1Duration,
                config.Adaptive2Duration,
                config.MaxRetakeAttempts,
                config.RetakeCooldownHours,
                config.LowToMediumThreshold,
                config.MediumToHighThreshold,
                config.QuestionsPerAdaptiveTest,
                config.BaseTestWeight,
                config.AdaptiveTestWeight,
                config.IsActive,
                config.CreatedAt,
                config.UpdatedAt,
                CreatorName = config.Creator?.Name ?? "System"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving adaptive configuration", error = ex.Message });
        }
    }

    [HttpPut("adaptive")]
    public async Task<IActionResult> UpdateAdaptiveConfig([FromBody] UpdateAdaptiveConfigRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token" });
            }

            // Validate the request
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Validate percentage values
            if (request.LowDifficultyPercentage < 0 || request.LowDifficultyPercentage > 100 ||
                request.MediumDifficultyPercentage < 0 || request.MediumDifficultyPercentage > 100 ||
                request.HighDifficultyPercentage < 0 || request.HighDifficultyPercentage > 100 ||
                request.LowToMediumThreshold < 0 || request.LowToMediumThreshold > 100 ||
                request.MediumToHighThreshold < 0 || request.MediumToHighThreshold > 100 ||
                request.BaseTestWeight < 0 || request.BaseTestWeight > 100 ||
                request.AdaptiveTestWeight < 0 || request.AdaptiveTestWeight > 100)
            {
                return BadRequest(new { message = "Percentage values must be between 0 and 100" });
            }

            // Validate that weights add up to 100
            if (request.BaseTestWeight + request.AdaptiveTestWeight != 100)
            {
                return BadRequest(new { message = "Base test weight and adaptive test weight must add up to 100%" });
            }

            // Deactivate existing configurations
            var existingConfigs = await _context.AdaptiveConfigs
                .Where(c => c.IsActive)
                .ToListAsync();

            foreach (var config in existingConfigs)
            {
                config.IsActive = false;
                config.UpdatedAt = DateTime.UtcNow;
            }

            // Create new configuration
            var newConfig = new AdaptiveConfig
            {
                ConfigName = request.ConfigName ?? "Default",
                LowDifficultyPercentage = request.LowDifficultyPercentage,
                MediumDifficultyPercentage = request.MediumDifficultyPercentage,
                HighDifficultyPercentage = request.HighDifficultyPercentage,
                BaseTestDuration = request.BaseTestDuration,
                Adaptive1Duration = request.Adaptive1Duration,
                Adaptive2Duration = request.Adaptive2Duration,
                MaxRetakeAttempts = request.MaxRetakeAttempts,
                RetakeCooldownHours = request.RetakeCooldownHours,
                LowToMediumThreshold = request.LowToMediumThreshold,
                MediumToHighThreshold = request.MediumToHighThreshold,
                QuestionsPerAdaptiveTest = request.QuestionsPerAdaptiveTest,
                BaseTestWeight = request.BaseTestWeight,
                AdaptiveTestWeight = request.AdaptiveTestWeight,
                IsActive = true,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AdaptiveConfigs.Add(newConfig);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Adaptive configuration updated successfully",
                configId = newConfig.Id
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating adaptive configuration", error = ex.Message });
        }
    }

    [HttpGet("adaptive/history")]
    public async Task<IActionResult> GetAdaptiveConfigHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            var totalConfigs = await _context.AdaptiveConfigs.CountAsync();
            var configs = await _context.AdaptiveConfigs
                .Include(c => c.Creator)
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new
                {
                    c.Id,
                    c.ConfigName,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt,
                    CreatorName = c.Creator.Name
                })
                .ToListAsync();

            return Ok(new
            {
                configs,
                totalPages = (int)Math.Ceiling((double)totalConfigs / pageSize),
                currentPage = page,
                totalConfigs
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving configuration history", error = ex.Message });
        }
    }
}

public class UpdateAdaptiveConfigRequest
{
    public string? ConfigName { get; set; }
    public int LowDifficultyPercentage { get; set; }
    public int MediumDifficultyPercentage { get; set; }
    public int HighDifficultyPercentage { get; set; }
    public int BaseTestDuration { get; set; }
    public int Adaptive1Duration { get; set; }
    public int Adaptive2Duration { get; set; }
    public int MaxRetakeAttempts { get; set; }
    public int RetakeCooldownHours { get; set; }
    public int LowToMediumThreshold { get; set; }
    public int MediumToHighThreshold { get; set; }
    public int QuestionsPerAdaptiveTest { get; set; }
    public int BaseTestWeight { get; set; }
    public int AdaptiveTestWeight { get; set; }
}