using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class CalendarController : ControllerBase
{
    private readonly AppDbContext _context;

    public CalendarController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] DateTime? start = null, [FromQuery] DateTime? end = null)
    {
        var query = _context.CalendarEvents.Include(e => e.Creator).AsQueryable();

        if (start.HasValue)
            query = query.Where(e => e.StartTime >= start.Value);

        if (end.HasValue)
            query = query.Where(e => e.EndTime <= end.Value);

        var events = await query
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.StartTime,
                e.EndTime,
                Type = e.Type.ToString(),
                e.Location,
                CreatedBy = e.Creator.Name,
                e.IsRecurring,
                e.CreatedAt
            })
            .OrderBy(e => e.StartTime)
            .ToListAsync();

        return Ok(new { success = true, data = events });
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var calendarEvent = new CalendarEvent
        {
            Title = dto.Title,
            Description = dto.Description,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Type = dto.Type,
            Location = dto.Location,
            CreatedBy = userId,
            IsRecurring = dto.IsRecurring,
            RecurrenceRule = dto.RecurrenceRule
        };

        _context.CalendarEvents.Add(calendarEvent);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Event created successfully" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventDto dto)
    {
        var calendarEvent = await _context.CalendarEvents.FindAsync(id);
        if (calendarEvent == null)
            return NotFound(new { success = false, message = "Event not found" });

        calendarEvent.Title = dto.Title;
        calendarEvent.Description = dto.Description;
        calendarEvent.StartTime = dto.StartTime;
        calendarEvent.EndTime = dto.EndTime;
        calendarEvent.Type = dto.Type;
        calendarEvent.Location = dto.Location;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Event updated successfully" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        var calendarEvent = await _context.CalendarEvents.FindAsync(id);
        if (calendarEvent == null)
            return NotFound(new { success = false, message = "Event not found" });

        _context.CalendarEvents.Remove(calendarEvent);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Event deleted successfully" });
    }
}

public class CreateEventDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public EventType Type { get; set; }
    public string? Location { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? RecurrenceRule { get; set; }
}

public class UpdateEventDto : CreateEventDto { }