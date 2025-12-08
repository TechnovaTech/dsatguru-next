using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AnnouncementController : ControllerBase
{
    private readonly AppDbContext _context;

    public AnnouncementController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAnnouncements()
    {
        var announcements = await _context.Announcements
            .Include(a => a.Creator)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Content,
                Type = a.Type.ToString(),
                a.TargetAudience,
                a.IsUrgent,
                a.ScheduledAt,
                a.IsSent,
                CreatedBy = a.Creator.Name,
                a.CreatedAt
            })
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(new { success = true, data = announcements });
    }

    [HttpPost]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var announcement = new Announcement
        {
            Title = dto.Title,
            Content = dto.Content,
            Type = dto.Type,
            TargetAudience = dto.TargetAudience,
            IsUrgent = dto.IsUrgent,
            ScheduledAt = dto.ScheduledAt,
            CreatedBy = userId
        };

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Announcement created successfully" });
    }

    [HttpPost("{id}/send")]
    public async Task<IActionResult> SendAnnouncement(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null)
            return NotFound(new { success = false, message = "Announcement not found" });

        announcement.IsSent = true;
        await _context.SaveChangesAsync();

        // TODO: Implement actual sending logic (email, SMS, push notifications)
        
        return Ok(new { success = true, message = "Announcement sent successfully" });
    }
}

public class CreateAnnouncementDto
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public AnnouncementType Type { get; set; }
    public string? TargetAudience { get; set; }
    public bool IsUrgent { get; set; } = false;
    public DateTime? ScheduledAt { get; set; }
}