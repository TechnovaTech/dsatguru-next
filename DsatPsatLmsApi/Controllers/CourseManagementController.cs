using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Text.Json;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class CourseManagementController : ControllerBase
{
    private readonly AppDbContext _context;

    public CourseManagementController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCourses(
        [FromQuery] string? search = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .Include(c => c.Enrollments)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Title.Contains(search) || c.Description!.Contains(search));

        if (!string.IsNullOrEmpty(type))
            query = query.Where(c => c.Type == type);

        if (minPrice.HasValue)
            query = query.Where(c => c.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(c => c.Price <= maxPrice.Value);

        var totalCount = await query.CountAsync();
        var courses = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.Type,
                c.Price,
                c.DiscountedPrice,
                c.DiscountPercentage,
                c.StripeProductId,
                c.StripePriceId,
                c.CreatedAt,
                c.UpdatedAt,
                HighlightsCount = c.Highlights.Count,
                SchedulesCount = c.Schedules.Count,
                FAQsCount = c.FAQs.Count,
                EnrollmentsCount = c.Enrollments.Count,
                Revenue = c.Enrollments.SelectMany(e => e.Payments)
                    .Where(p => p.Status == PaymentStatus.Succeeded)
                    .Sum(p => p.Amount)
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = courses,
            pagination = new
            {
                page,
                pageSize,
                totalCount,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCourse(Guid id)
    {
        var course = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .Include(c => c.Enrollments).ThenInclude(e => e.User)
            .Include(c => c.ZoomSessions)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
            return NotFound(new { success = false, message = "Course not found" });

        return Ok(new
        {
            success = true,
            data = new
            {
                course.Id,
                course.Title,
                course.Description,
                course.Overview,
                course.CourseDetails,
                course.BannerImageUrl,
                course.Type,
                course.Price,
                course.DiscountedPrice,
                course.DiscountPercentage,
                course.StripeProductId,
                course.StripePriceId,
                course.CreatedAt,
                course.UpdatedAt,
                Highlights = course.Highlights.OrderBy(h => h.SequenceOrder).Select(h => new { h.Id, h.Text, h.SequenceOrder }),
                Schedules = course.Schedules.Select(s => new { s.Id, s.Day, s.Time }),
                FAQs = course.FAQs.Select(f => new { f.Id, f.Question, f.Answer }),
                Enrollments = course.Enrollments.Select(e => new
                {
                    e.Id,
                    StudentName = e.User.Name,
                    StudentEmail = e.User.Email,
                    e.EnrolledAt
                }),
                ZoomSessions = course.ZoomSessions.Select(z => new
                {
                    z.Id,
                    z.ZoomLink,
                    z.SessionDate,
                    z.StartTime,
                    z.EndTime,
                    z.IsSent
                })
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto dto)
    {
        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            Overview = string.IsNullOrEmpty(dto.Overview) ? null : dto.Overview,
            CourseDetails = string.IsNullOrEmpty(dto.CourseDetails) ? null : dto.CourseDetails,
            BannerImageUrl = string.IsNullOrEmpty(dto.BannerImageUrl) ? null : dto.BannerImageUrl,
            Type = dto.Type ?? "course",
            Price = dto.Price,
            DiscountedPrice = dto.DiscountedPrice,
            DiscountPercentage = dto.DiscountPercentage,
            StripeProductId = string.IsNullOrEmpty(dto.StripeProductId) ? null : dto.StripeProductId,
            StripePriceId = string.IsNullOrEmpty(dto.StripePriceId) ? null : dto.StripePriceId
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        // Add highlights
        if (dto.Highlights?.Any() == true)
        {
            var highlights = dto.Highlights.Select((h, index) => new CourseHighlight
            {
                CourseId = course.Id,
                Text = h,
                SequenceOrder = index // Set sequence order based on the order in the list
            }).ToList();
            _context.CourseHighlights.AddRange(highlights);
        }

        // Add schedules
        if (dto.Schedules?.Any() == true)
        {
            var schedules = dto.Schedules.Select(s => new CourseSchedule
            {
                CourseId = course.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList();
            _context.CourseSchedules.AddRange(schedules);
        }

        // Add FAQs
        if (dto.FAQs?.Any() == true)
        {
            var faqs = dto.FAQs.Select(f => new CourseFAQ
            {
                CourseId = course.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList();
            _context.CourseFAQs.AddRange(faqs);
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Course created successfully", id = course.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseDto dto)
    {
        var course = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
            return NotFound(new { success = false, message = "Course not found" });

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Overview = string.IsNullOrEmpty(dto.Overview) ? null : dto.Overview;
        course.CourseDetails = string.IsNullOrEmpty(dto.CourseDetails) ? null : dto.CourseDetails;
        course.BannerImageUrl = string.IsNullOrEmpty(dto.BannerImageUrl) ? null : dto.BannerImageUrl;
        if (dto.Type != null) course.Type = dto.Type;
        course.Price = dto.Price;
        course.DiscountedPrice = dto.DiscountedPrice;
        course.DiscountPercentage = dto.DiscountPercentage;
        course.StripeProductId = string.IsNullOrEmpty(dto.StripeProductId) ? null : dto.StripeProductId;
        course.StripePriceId = string.IsNullOrEmpty(dto.StripePriceId) ? null : dto.StripePriceId;
        course.UpdatedAt = DateTime.UtcNow;

        // Update highlights
        _context.CourseHighlights.RemoveRange(course.Highlights);
        if (dto.Highlights?.Any() == true)
        {
            var highlights = dto.Highlights.Select((h, index) => new CourseHighlight
            {
                CourseId = course.Id,
                Text = h,
                SequenceOrder = index // Set sequence order based on the order in the list
            }).ToList();
            _context.CourseHighlights.AddRange(highlights);
        }

        // Update schedules
        _context.CourseSchedules.RemoveRange(course.Schedules);
        if (dto.Schedules?.Any() == true)
        {
            var schedules = dto.Schedules.Select(s => new CourseSchedule
            {
                CourseId = course.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList();
            _context.CourseSchedules.AddRange(schedules);
        }

        // Update FAQs
        _context.CourseFAQs.RemoveRange(course.FAQs);
        if (dto.FAQs?.Any() == true)
        {
            var faqs = dto.FAQs.Select(f => new CourseFAQ
            {
                CourseId = course.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList();
            _context.CourseFAQs.AddRange(faqs);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Course updated successfully" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCourse(Guid id)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.Enrollments)
                    .ThenInclude(e => e.Payments)
                .Include(c => c.Highlights)
                .Include(c => c.Schedules)
                .Include(c => c.FAQs)
                .Include(c => c.ZoomSessions)
                .Include(c => c.LiveMeetings)
                .Include(c => c.StudyMaterials)
                .Include(c => c.SyllabusTopics)
                .Include(c => c.Assignments)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null)
                return NotFound(new { success = false, message = "Course not found" });

            // Check if there are any enrollments with payments
            if (course.Enrollments.Any(e => e.Payments.Any()))
                return BadRequest(new { success = false, message = "Cannot delete course with existing enrollments that have payments" });

            // Remove payments for any enrollments first
            foreach (var enrollment in course.Enrollments)
            {
                _context.Payments.RemoveRange(enrollment.Payments);
            }
            
            // Remove enrollments
            _context.CourseEnrollments.RemoveRange(course.Enrollments);

            // Remove all related entities first
            // Remove StudentProgress records for this course
            var studentProgresses = await _context.StudentProgresses
                .Where(sp => sp.CourseId == id)
                .ToListAsync();
            _context.StudentProgresses.RemoveRange(studentProgresses);
            
            _context.CourseHighlights.RemoveRange(course.Highlights);
            _context.CourseSchedules.RemoveRange(course.Schedules);
            _context.CourseFAQs.RemoveRange(course.FAQs);
            _context.ZoomSessions.RemoveRange(course.ZoomSessions);
            _context.LiveMeetings.RemoveRange(course.LiveMeetings);
            _context.StudyMaterials.RemoveRange(course.StudyMaterials);
            _context.SyllabusTopics.RemoveRange(course.SyllabusTopics);
            _context.Assignments.RemoveRange(course.Assignments);
            
            // Finally remove the course
            _context.Courses.Remove(course);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Course deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "An error occurred while deleting the course", error = ex.Message });
        }
    }

    [HttpGet("{id}/analytics")]
    public async Task<IActionResult> GetCourseAnalytics(Guid id)
    {
        var course = await _context.Courses
            .Include(c => c.Enrollments).ThenInclude(e => e.Payments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
            return NotFound(new { success = false, message = "Course not found" });

        var totalEnrollments = course.Enrollments.Count;
        var totalRevenue = course.Enrollments
            .SelectMany(e => e.Payments)
            .Where(p => p.Status == PaymentStatus.Succeeded)
            .Sum(p => p.Amount);

        var monthlyEnrollments = course.Enrollments
            .Where(e => e.EnrolledAt >= DateTime.UtcNow.AddMonths(-1))
            .Count();

        var enrollmentTrend = course.Enrollments
            .GroupBy(e => new { e.EnrolledAt.Year, e.EnrolledAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalEnrollments,
                totalRevenue,
                monthlyEnrollments,
                averageRevenuePerStudent = totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0,
                enrollmentTrend
            }
        });
    }

    [HttpPost("{id}/zoom-session")]
    public async Task<IActionResult> AddZoomSession(Guid id, [FromBody] CreateZoomSessionDto dto)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null)
            return NotFound(new { success = false, message = "Course not found" });

        var zoomSession = new ZoomSession
        {
            CourseId = id,
            ScheduleId = dto.ScheduleId,
            ZoomLink = dto.ZoomLink,
            MeetingId = dto.MeetingId,
            Passcode = dto.Passcode,
            SessionDate = dto.SessionDate,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime
        };

        _context.ZoomSessions.Add(zoomSession);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Zoom session added successfully", id = zoomSession.Id });
    }
}

public class CreateCourseDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Overview { get; set; }
    public string? CourseDetails { get; set; }
    public string? BannerImageUrl { get; set; }
    public string Type { get; set; } = "course";
    public decimal Price { get; set; }
    public decimal? DiscountedPrice { get; set; }
    public decimal? DiscountPercentage { get; set; }
    public string? StripeProductId { get; set; }
    public string? StripePriceId { get; set; }
    public List<string>? Highlights { get; set; }
    public List<ScheduleDto>? Schedules { get; set; }
    public List<FAQDto>? FAQs { get; set; }
}

public class UpdateCourseDto : CreateCourseDto { }

public class ScheduleDto
{
    public string Day { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class FAQDto
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}

public class CreateZoomSessionDto
{
    public Guid? ScheduleId { get; set; }
    public string ZoomLink { get; set; } = string.Empty;
    public string? MeetingId { get; set; }
    public string? Passcode { get; set; }
    public DateTime SessionDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
}