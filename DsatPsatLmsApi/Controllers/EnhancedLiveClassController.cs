using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Tutor")]
public class EnhancedLiveClassController : ControllerBase
{
    private readonly AppDbContext _context;

    public EnhancedLiveClassController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetClasses(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? status = null,
        [FromQuery] Guid? instructorId = null,
        [FromQuery] Guid? classTypeId = null)
    {
        var query = _context.EnhancedLiveClasses
            .Include(c => c.Instructor)
            .Include(c => c.ClassType)
            .Include(c => c.Enrollments)
            .AsQueryable();

        if (startDate.HasValue)
            query = query.Where(c => c.StartTime >= startDate.Value);

        if (endDate.HasValue)
            query = query.Where(c => c.EndTime <= endDate.Value);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ClassStatus>(status, out var statusEnum))
            query = query.Where(c => c.Status == statusEnum);

        if (instructorId.HasValue)
            query = query.Where(c => c.InstructorId == instructorId.Value);

        if (classTypeId.HasValue)
            query = query.Where(c => c.ClassTypeId == classTypeId.Value);

        var classes = await query
            .OrderBy(c => c.StartTime)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.StartTime,
                c.EndTime,
                Status = c.Status.ToString(),
                InstructorName = c.Instructor.Name,
                ClassTypeName = c.ClassType.Name,
                EnrolledCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Enrolled),
                WaitlistCount = c.Enrollments.Count(e => e.Status == EnrollmentStatus.Waitlisted),
                c.MaxStudents,
                c.ZoomJoinUrl,
                c.GoogleMeetUrl,
                c.IsRecurring,
                c.RecordingUrl
            })
            .ToListAsync();

        return Ok(new { success = true, data = classes });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetClass(Guid id)
    {
        var liveClass = await _context.EnhancedLiveClasses
            .Include(c => c.Instructor)
            .Include(c => c.ClassType)
            .Include(c => c.Enrollments).ThenInclude(e => e.Student)
            .Include(c => c.Attendances).ThenInclude(a => a.Student)
            .Include(c => c.Messages).ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (liveClass == null)
            return NotFound(new { success = false, message = "Class not found" });

        var resources = string.IsNullOrEmpty(liveClass.Resources) 
            ? new string[0] 
            : JsonSerializer.Deserialize<string[]>(liveClass.Resources) ?? new string[0];

        return Ok(new
        {
            success = true,
            data = new
            {
                liveClass.Id,
                liveClass.Title,
                liveClass.Description,
                liveClass.StartTime,
                liveClass.EndTime,
                Status = liveClass.Status.ToString(),
                InstructorName = liveClass.Instructor.Name,
                ClassTypeName = liveClass.ClassType.Name,
                liveClass.MaxStudents,
                liveClass.ZoomJoinUrl,
                liveClass.GoogleMeetUrl,
                liveClass.RecordingUrl,
                Resources = resources,
                Enrollments = liveClass.Enrollments.Select(e => new
                {
                    e.Id,
                    StudentName = e.Student.Name,
                    StudentEmail = e.Student.Email,
                    Status = e.Status.ToString(),
                    e.EnrolledAt,
                    e.WaitlistPosition
                }),
                Attendances = liveClass.Attendances.Select(a => new
                {
                    a.Id,
                    StudentName = a.Student.Name,
                    a.JoinedAt,
                    a.LeftAt,
                    a.TotalMinutesAttended,
                    Status = a.Status.ToString()
                }),
                Messages = liveClass.Messages.OrderBy(m => m.SentAt).Select(m => new
                {
                    m.Id,
                    SenderName = m.Sender.Name,
                    m.Message,
                    Type = m.Type.ToString(),
                    m.IsQuestion,
                    m.IsAnswered,
                    m.SentAt
                })
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateClass([FromBody] CreateEnhancedLiveClassDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var liveClass = new EnhancedLiveClass
        {
            Title = dto.Title,
            Description = dto.Description,
            ClassTypeId = dto.ClassTypeId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            InstructorId = dto.InstructorId,
            MaxStudents = dto.MaxStudents,
            ZoomMeetingId = dto.ZoomMeetingId,
            ZoomJoinUrl = dto.ZoomJoinUrl,
            ZoomPassword = dto.ZoomPassword,
            GoogleMeetUrl = dto.GoogleMeetUrl,
            IsRecurring = dto.IsRecurring,
            RecurrenceRule = dto.RecurrenceRule,
            Resources = dto.Resources?.Any() == true ? JsonSerializer.Serialize(dto.Resources) : null
        };

        _context.EnhancedLiveClasses.Add(liveClass);
        await _context.SaveChangesAsync();

        // Create recurring classes if specified
        if (dto.IsRecurring && !string.IsNullOrEmpty(dto.RecurrenceRule))
        {
            await CreateRecurringClasses(liveClass, dto.RecurrenceRule);
        }

        return Ok(new { success = true, message = "Class created successfully", id = liveClass.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateEnhancedLiveClassDto dto)
    {
        var liveClass = await _context.EnhancedLiveClasses.FindAsync(id);
        if (liveClass == null)
            return NotFound(new { success = false, message = "Class not found" });

        liveClass.Title = dto.Title;
        liveClass.Description = dto.Description;
        liveClass.StartTime = dto.StartTime;
        liveClass.EndTime = dto.EndTime;
        liveClass.MaxStudents = dto.MaxStudents;
        liveClass.Status = dto.Status;
        liveClass.ZoomJoinUrl = dto.ZoomJoinUrl;
        liveClass.GoogleMeetUrl = dto.GoogleMeetUrl;
        liveClass.RecordingUrl = dto.RecordingUrl;
        liveClass.Resources = dto.Resources?.Any() == true ? JsonSerializer.Serialize(dto.Resources) : null;
        liveClass.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Class updated successfully" });
    }

    [HttpPost("{id}/enroll")]
    public async Task<IActionResult> EnrollStudent(Guid id, [FromBody] EnrollStudentDto dto)
    {
        var liveClass = await _context.EnhancedLiveClasses
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (liveClass == null)
            return NotFound(new { success = false, message = "Class not found" });

        var existingEnrollment = liveClass.Enrollments
            .FirstOrDefault(e => e.StudentId == dto.StudentId);

        if (existingEnrollment != null)
            return BadRequest(new { success = false, message = "Student already enrolled" });

        var enrolledCount = liveClass.Enrollments.Count(e => e.Status == EnrollmentStatus.Enrolled);
        var enrollment = new ClassEnrollment
        {
            ClassId = id,
            StudentId = dto.StudentId,
            Status = enrolledCount < liveClass.MaxStudents ? EnrollmentStatus.Enrolled : EnrollmentStatus.Waitlisted,
            WaitlistPosition = enrolledCount >= liveClass.MaxStudents ? 
                liveClass.Enrollments.Count(e => e.Status == EnrollmentStatus.Waitlisted) + 1 : 0
        };

        _context.ClassEnrollments.Add(enrollment);
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = enrollment.Status == EnrollmentStatus.Enrolled ? "Student enrolled successfully" : "Student added to waitlist",
            status = enrollment.Status.ToString(),
            waitlistPosition = enrollment.WaitlistPosition
        });
    }

    [HttpPost("{id}/attendance")]
    public async Task<IActionResult> MarkAttendance(Guid id, [FromBody] MarkAttendanceDto dto)
    {
        var attendance = await _context.ClassAttendances
            .FirstOrDefaultAsync(a => a.ClassId == id && a.StudentId == dto.StudentId);

        if (attendance == null)
        {
            attendance = new ClassAttendance
            {
                ClassId = id,
                StudentId = dto.StudentId,
                JoinedAt = dto.JoinedAt,
                Status = AttendanceStatus.Present,
                IsPresent = true
            };
            _context.ClassAttendances.Add(attendance);
        }
        else
        {
            attendance.LeftAt = dto.LeftAt;
            if (dto.JoinedAt.HasValue && dto.LeftAt.HasValue)
            {
                attendance.TotalMinutesAttended = (int)(dto.LeftAt.Value - dto.JoinedAt.Value).TotalMinutes;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Attendance marked successfully" });
    }

    [HttpPost("{id}/feedback")]
    public async Task<IActionResult> SubmitFeedback(Guid id, [FromBody] ClassFeedbackDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var existingFeedback = await _context.ClassFeedbacks
            .FirstOrDefaultAsync(f => f.ClassId == id && f.StudentId == userId);

        if (existingFeedback != null)
            return BadRequest(new { success = false, message = "Feedback already submitted" });

        var feedback = new ClassFeedback
        {
            ClassId = id,
            StudentId = userId,
            Rating = dto.Rating,
            Comments = dto.Comments,
            ContentRating = dto.ContentRating,
            InstructorRating = dto.InstructorRating,
            TechnicalRating = dto.TechnicalRating
        };

        _context.ClassFeedbacks.Add(feedback);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Feedback submitted successfully" });
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageDto dto)
    {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value!);

        var message = new ClassMessage
        {
            ClassId = id,
            SenderId = userId,
            Message = dto.Message,
            Type = dto.Type,
            IsQuestion = dto.IsQuestion
        };

        _context.ClassMessages.Add(message);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Message sent successfully", id = message.Id });
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetClassTypes()
    {
        var classTypes = await _context.ClassTypes
            .Where(ct => ct.IsActive)
            .Select(ct => new
            {
                ct.Id,
                ct.Name,
                ct.Description,
                ct.DefaultDurationMinutes,
                ct.MaxCapacity,
                ct.Price
            })
            .ToListAsync();

        return Ok(new { success = true, data = classTypes });
    }

    [HttpPost("types")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateClassType([FromBody] CreateClassTypeDto dto)
    {
        var classType = new ClassType
        {
            Name = dto.Name,
            Description = dto.Description,
            DefaultDurationMinutes = dto.DefaultDurationMinutes,
            MaxCapacity = dto.MaxCapacity,
            Price = dto.Price
        };

        _context.ClassTypes.Add(classType);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Class type created successfully", id = classType.Id });
    }

    private async Task CreateRecurringClasses(EnhancedLiveClass parentClass, string recurrenceRule)
    {
        // Simple implementation - create next 10 occurrences
        // In production, you'd parse the recurrence rule properly
        var recurringClasses = new List<EnhancedLiveClass>();
        var duration = parentClass.EndTime - parentClass.StartTime;

        for (int i = 1; i <= 10; i++)
        {
            var nextStartTime = parentClass.StartTime.AddDays(7 * i); // Weekly recurrence
            var recurringClass = new EnhancedLiveClass
            {
                Title = parentClass.Title,
                Description = parentClass.Description,
                ClassTypeId = parentClass.ClassTypeId,
                StartTime = nextStartTime,
                EndTime = nextStartTime.Add(duration),
                InstructorId = parentClass.InstructorId,
                MaxStudents = parentClass.MaxStudents,
                ParentClassId = parentClass.Id,
                IsRecurring = false,
                Resources = parentClass.Resources
            };
            recurringClasses.Add(recurringClass);
        }

        _context.EnhancedLiveClasses.AddRange(recurringClasses);
        await _context.SaveChangesAsync();
    }
}

public class CreateEnhancedLiveClassDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid ClassTypeId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public Guid InstructorId { get; set; }
    public int MaxStudents { get; set; } = 50;
    public string? ZoomMeetingId { get; set; }
    public string? ZoomJoinUrl { get; set; }
    public string? ZoomPassword { get; set; }
    public string? GoogleMeetUrl { get; set; }
    public bool IsRecurring { get; set; } = false;
    public string? RecurrenceRule { get; set; }
    public string[]? Resources { get; set; }
}

public class UpdateEnhancedLiveClassDto : CreateEnhancedLiveClassDto
{
    public ClassStatus Status { get; set; }
    public string? RecordingUrl { get; set; }
}

public class EnrollStudentDto
{
    public Guid StudentId { get; set; }
}

public class MarkAttendanceDto
{
    public Guid StudentId { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
}

public class ClassFeedbackDto
{
    public int Rating { get; set; }
    public string? Comments { get; set; }
    public int ContentRating { get; set; }
    public int InstructorRating { get; set; }
    public int TechnicalRating { get; set; }
}

public class SendMessageDto
{
    public string Message { get; set; } = string.Empty;
    public MessageType Type { get; set; } = MessageType.Chat;
    public bool IsQuestion { get; set; } = false;
}

public class CreateClassTypeDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DefaultDurationMinutes { get; set; } = 60;
    public int MaxCapacity { get; set; } = 50;
    public decimal Price { get; set; } = 0;
}