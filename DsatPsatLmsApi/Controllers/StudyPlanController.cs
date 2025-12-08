using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudyPlanController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudyPlanController(AppDbContext context)
        {
            _context = context;
        }

        // Admin endpoints
        [HttpGet("modules")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<StudyPlanModuleDto>>> GetAllModules()
        {
            var modules = await _context.StudyPlanModules
                .Include(m => m.RoutingRules)
                    .ThenInclude(r => r.ToModule)
                .OrderBy(m => m.OrderIndex)
                .Select(m => new StudyPlanModuleDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    Type = m.Type,
                    Description = m.Description,
                    OrderIndex = m.OrderIndex,
                    IsActive = m.IsActive,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    RoutingRules = m.RoutingRules.Select(r => new PerformanceRoutingDto
                    {
                        Id = r.Id,
                        FromModuleId = r.FromModuleId,
                        ToModuleId = r.ToModuleId,
                        ToModuleTitle = r.ToModule.Title,
                        MinScore = r.MinScore,
                        MaxScore = r.MaxScore,
                        Description = r.Description,
                        IsActive = r.IsActive,
                        CreatedAt = r.CreatedAt,
                        UpdatedAt = r.UpdatedAt
                    }).ToList()
                })
                .ToListAsync();

            return Ok(modules);
        }

        [HttpGet("modules/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudyPlanModuleDto>> GetModule(Guid id)
        {
            var module = await _context.StudyPlanModules
                .Include(m => m.RoutingRules)
                    .ThenInclude(r => r.ToModule)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (module == null)
                return NotFound();

            var moduleDto = new StudyPlanModuleDto
            {
                Id = module.Id,
                Title = module.Title,
                Type = module.Type,
                Description = module.Description,
                OrderIndex = module.OrderIndex,
                IsActive = module.IsActive,
                CreatedAt = module.CreatedAt,
                UpdatedAt = module.UpdatedAt,
                RoutingRules = module.RoutingRules.Select(r => new PerformanceRoutingDto
                {
                    Id = r.Id,
                    FromModuleId = r.FromModuleId,
                    ToModuleId = r.ToModuleId,
                    ToModuleTitle = r.ToModule.Title,
                    MinScore = r.MinScore,
                    MaxScore = r.MaxScore,
                    Description = r.Description,
                    IsActive = r.IsActive,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                }).ToList()
            };

            return Ok(moduleDto);
        }

        [HttpPost("modules")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudyPlanModuleDto>> CreateModule(CreateStudyPlanModuleDto dto)
        {
            var module = new StudyPlanModule
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Type = dto.Type,
                Description = dto.Description,
                OrderIndex = dto.OrderIndex,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.StudyPlanModules.Add(module);
            await _context.SaveChangesAsync();

            // Initialize progress for all users
            await InitializeModuleProgressForAllUsers(module.Id);

            // Return a simple DTO without complex navigation properties to avoid authorization issues
            var responseDto = new StudyPlanModuleDto
            {
                Id = module.Id,
                Title = module.Title,
                Type = module.Type,
                Description = module.Description,
                OrderIndex = module.OrderIndex,
                IsActive = module.IsActive,
                CreatedAt = module.CreatedAt,
                UpdatedAt = module.UpdatedAt,
                RoutingRules = new List<PerformanceRoutingDto>()
            };

            return CreatedAtAction(nameof(GetModule), new { id = module.Id }, responseDto);
        }

        [HttpPut("modules/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<StudyPlanModuleDto>> UpdateModule(Guid id, UpdateStudyPlanModuleDto dto)
        {
            var module = await _context.StudyPlanModules.FindAsync(id);
            if (module == null)
                return NotFound();

            if (!string.IsNullOrEmpty(dto.Title))
                module.Title = dto.Title;
            if (dto.Type.HasValue)
                module.Type = dto.Type.Value;
            if (dto.Description != null)
                module.Description = dto.Description;

            if (dto.OrderIndex.HasValue)
                module.OrderIndex = dto.OrderIndex.Value;
            if (dto.IsActive.HasValue)
                module.IsActive = dto.IsActive.Value;

            module.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(await GetModuleDto(id));
        }

        [HttpDelete("modules/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteModule(Guid id)
        {
            var module = await _context.StudyPlanModules.FindAsync(id);
            if (module == null)
                return NotFound();

            _context.StudyPlanModules.Remove(module);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Performance Routing endpoints
        [HttpPost("routing")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PerformanceRoutingDto>> CreateRouting(CreatePerformanceRoutingDto dto)
        {
            var routing = new PerformanceRouting
            {
                Id = Guid.NewGuid(),
                FromModuleId = dto.FromModuleId,
                ToModuleId = dto.ToModuleId,
                MinScore = dto.MinScore,
                MaxScore = dto.MaxScore,
                Description = dto.Description,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PerformanceRoutings.Add(routing);
            await _context.SaveChangesAsync();

            return Ok(await GetRoutingDto(routing.Id));
        }

        [HttpDelete("routing/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteRouting(Guid id)
        {
            var routing = await _context.PerformanceRoutings.FindAsync(id);
            if (routing == null)
                return NotFound();

            _context.PerformanceRoutings.Remove(routing);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // User endpoints
        [HttpGet("user/study-plan")]
        public async Task<ActionResult<UserStudyPlanDto>> GetUserStudyPlan()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            await EnsureUserHasModuleProgress(userId.Value);

            var userProgress = await _context.StudyPlanModuleProgresses
                .Include(p => p.Module)
                .Where(p => p.UserId == userId.Value)
                .OrderBy(p => p.Module.OrderIndex)
                .Select(p => new StudyPlanModuleProgressDto
                {
                    Id = p.Id,
                    UserId = p.UserId,
                    ModuleId = p.ModuleId,
                    ModuleTitle = p.Module.Title,
                    ModuleType = p.Module.Type,
                    Status = p.Status,
                    ProgressPercentage = p.ProgressPercentage,
                    Score = p.Score,
                    StartedAt = p.StartedAt,
                    CompletedAt = p.CompletedAt,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                })
                .ToListAsync();

            var currentModule = userProgress.FirstOrDefault(p => p.Status == ModuleStatus.InProgress) ??
                               userProgress.FirstOrDefault(p => p.Status == ModuleStatus.Unlocked);

            var nextModule = userProgress.FirstOrDefault(p => p.Status == ModuleStatus.Locked);

            var studyPlan = new UserStudyPlanDto
            {
                UserId = userId.Value,
                Modules = userProgress,
                CurrentModule = currentModule,
                NextModule = nextModule
            };

            return Ok(studyPlan);
        }

        [HttpPost("user/modules/{moduleId}/start")]
        public async Task<ActionResult> StartModule(Guid moduleId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var progress = await _context.StudyPlanModuleProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId.Value && p.ModuleId == moduleId);

            if (progress == null)
                return NotFound();

            if (progress.Status != ModuleStatus.Unlocked)
                return BadRequest("Module is not available to start");

            progress.Status = ModuleStatus.InProgress;
            progress.StartedAt = DateTime.UtcNow;
            progress.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPost("user/modules/{moduleId}/complete")]
        public async Task<ActionResult> CompleteModule(Guid moduleId, [FromBody] UpdateModuleProgressDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var progress = await _context.StudyPlanModuleProgresses
                .Include(p => p.Module)
                .FirstOrDefaultAsync(p => p.UserId == userId.Value && p.ModuleId == moduleId);

            if (progress == null)
                return NotFound();

            if (progress.Status != ModuleStatus.InProgress)
                return BadRequest("Module is not in progress");

            progress.Status = ModuleStatus.Completed;
            progress.ProgressPercentage = 100;
            progress.Score = dto.Score;
            progress.CompletedAt = DateTime.UtcNow;
            progress.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Determine next module based on performance routing
            if (dto.Score.HasValue)
            {
                await DetermineNextModule(userId.Value, moduleId, dto.Score.Value);
            }

            return Ok();
        }

        // Helper methods
        private Guid? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private async Task<StudyPlanModuleDto> GetModuleDto(Guid moduleId)
        {
            var module = await _context.StudyPlanModules
                .Include(m => m.RoutingRules)
                    .ThenInclude(r => r.ToModule)
                .FirstOrDefaultAsync(m => m.Id == moduleId);

            return new StudyPlanModuleDto
            {
                Id = module.Id,
                Title = module.Title,
                Type = module.Type,
                Description = module.Description,
                OrderIndex = module.OrderIndex,
                IsActive = module.IsActive,
                CreatedAt = module.CreatedAt,
                UpdatedAt = module.UpdatedAt,
                RoutingRules = module.RoutingRules.Select(r => new PerformanceRoutingDto
                {
                    Id = r.Id,
                    FromModuleId = r.FromModuleId,
                    ToModuleId = r.ToModuleId,
                    ToModuleTitle = r.ToModule.Title,
                    MinScore = r.MinScore,
                    MaxScore = r.MaxScore,
                    Description = r.Description,
                    IsActive = r.IsActive,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                }).ToList()
            };
        }

        private async Task<PerformanceRoutingDto> GetRoutingDto(Guid routingId)
        {
            var routing = await _context.PerformanceRoutings
                .Include(r => r.FromModule)
                .Include(r => r.ToModule)
                .FirstOrDefaultAsync(r => r.Id == routingId);

            return new PerformanceRoutingDto
            {
                Id = routing.Id,
                FromModuleId = routing.FromModuleId,
                FromModuleTitle = routing.FromModule.Title,
                ToModuleId = routing.ToModuleId,
                ToModuleTitle = routing.ToModule.Title,
                MinScore = routing.MinScore,
                MaxScore = routing.MaxScore,
                Description = routing.Description,
                IsActive = routing.IsActive,
                CreatedAt = routing.CreatedAt,
                UpdatedAt = routing.UpdatedAt
            };
        }

        private async Task InitializeModuleProgressForAllUsers(Guid moduleId)
        {
            var users = await _context.Users.Where(u => u.Role == UserRole.Student).ToListAsync();
            var module = await _context.StudyPlanModules.FindAsync(moduleId);

            foreach (var user in users)
            {
                var existingProgress = await _context.StudyPlanModuleProgresses
                    .AnyAsync(p => p.UserId == user.Id && p.ModuleId == moduleId);

                if (!existingProgress)
                {
                    var status = module.Type == ModuleDifficultyType.Base ? ModuleStatus.Unlocked : ModuleStatus.Locked;
                    
                    var progress = new StudyPlanModuleProgress
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        ModuleId = moduleId,
                        Status = status,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StudyPlanModuleProgresses.Add(progress);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task EnsureUserHasModuleProgress(Guid userId)
        {
            var modules = await _context.StudyPlanModules.Where(m => m.IsActive).ToListAsync();
            
            foreach (var module in modules)
            {
                var existingProgress = await _context.StudyPlanModuleProgresses
                    .AnyAsync(p => p.UserId == userId && p.ModuleId == module.Id);

                if (!existingProgress)
                {
                    var status = module.Type == ModuleDifficultyType.Base ? ModuleStatus.Unlocked : ModuleStatus.Locked;
                    
                    var progress = new StudyPlanModuleProgress
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        ModuleId = module.Id,
                        Status = status,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.StudyPlanModuleProgresses.Add(progress);
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task DetermineNextModule(Guid userId, Guid completedModuleId, int score)
        {
            var routingRules = await _context.PerformanceRoutings
                .Include(r => r.ToModule)
                .Where(r => r.FromModuleId == completedModuleId && r.IsActive)
                .Where(r => score >= r.MinScore && score <= r.MaxScore)
                .ToListAsync();

            foreach (var rule in routingRules)
            {
                var progress = await _context.StudyPlanModuleProgresses
                    .FirstOrDefaultAsync(p => p.UserId == userId && p.ModuleId == rule.ToModuleId);

                if (progress != null && progress.Status == ModuleStatus.Locked)
                {
                    progress.Status = ModuleStatus.Unlocked;
                    progress.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}