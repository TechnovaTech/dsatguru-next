using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CourseContentController : ControllerBase
{
    private readonly AppDbContext _context;

    public CourseContentController(AppDbContext context)
    {
        _context = context;
    }

    // Get all course content for a specific course
    [HttpGet("{courseId}")]
    [Authorize] // Ensure user is authenticated
    public async Task<IActionResult> GetCourseContent(Guid courseId)
    {
        try
        {
            // Check if user is enrolled in the course or is admin
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out Guid userId))
            {
                return Unauthorized(new { message = "Invalid user" });
            }

            // Allow admins to access any course content
            if (userRole != "Admin")
            {
                var enrollment = await _context.CourseEnrollments
                    .FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);

                if (enrollment == null)
                {
                    return Forbid("You are not enrolled in this course");
                }
            }

            var course = await _context.Courses
            .Include(c => c.LiveMeetings)
            .Include(c => c.StudyMaterials)
            .Include(c => c.SyllabusTopics)
            .Include(c => c.Assignments)
            .FirstOrDefaultAsync(c => c.Id == courseId);

        if (course == null)
            return NotFound(new { message = "Course not found" });

        var content = new
        {
            meetings = course.LiveMeetings?.Select(m => new
            {
                id = m.Id,
                title = m.Title,
                date = m.Date.ToString("yyyy-MM-dd"),
                time = m.Time,
                zoomLink = m.ZoomLink,
                status = m.Status
            }).Cast<object>().ToList() ?? new List<object>(),
            
            materials = course.StudyMaterials?.Select(m => new
            {
                id = m.Id,
                type = m.Type,
                title = m.Title,
                url = m.Url,
                fileName = m.FileName,
                uploadDate = m.UploadDate.ToString("yyyy-MM-dd")
            }).Cast<object>().ToList() ?? new List<object>(),
            
            syllabus = course.SyllabusTopics?.OrderBy(s => s.Week).Select(s => new
            {
                id = s.Id,
                week = s.Week,
                title = s.Title,
                description = s.Description,
                materials = s.Materials?.Split(',').ToList() ?? new List<string>()
            }).Cast<object>().ToList() ?? new List<object>(),
            
            assignments = course.Assignments?.Select(a => new
            {
                id = a.Id,
                title = a.Title,
                description = a.Description,
                dueDate = a.DueDate.ToString("yyyy-MM-dd"),
                status = a.Status
            }).Cast<object>().ToList() ?? new List<object>()
        };

            return Ok(new { message = "Course content retrieved successfully", data = content });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in GetCourseContent: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Get meetings for a specific course
    [HttpGet("{courseId}/meetings")]
    public async Task<IActionResult> GetCourseMeetings(Guid courseId)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.LiveMeetings)
                .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course == null)
                return NotFound(new { message = "Course not found" });

            var meetings = course.LiveMeetings?.Select(m => new
            {
                id = m.Id,
                title = m.Title,
                date = m.Date.ToString("yyyy-MM-dd"),
                time = m.Time,
                zoomLink = m.ZoomLink,
                status = m.Status
            }).Cast<object>().ToList() ?? new List<object>();

            return Ok(new { message = "Meetings retrieved successfully", data = meetings });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Add Live Meeting
    [HttpPost("{courseId}/meetings")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddLiveMeeting(Guid courseId, [FromBody] CreateLiveMeetingDto dto)
    {
        try
        {
            var course = await _context.Courses.FindAsync(courseId);
            if (course == null)
                return NotFound(new { message = "Course not found" });

            if (!DateTime.TryParse(dto.Date, out DateTime meetingDate))
                return BadRequest(new { message = "Invalid date format" });

            var meeting = new LiveMeeting
            {
                CourseId = courseId,
                Title = dto.Title,
                Date = meetingDate,
                Time = dto.Time,
                ZoomLink = dto.ZoomLink,
                Status = dto.Status
            };

            _context.LiveMeetings.Add(meeting);
            await _context.SaveChangesAsync();

            var responseData = new
            {
                id = meeting.Id,
                title = meeting.Title,
                date = meeting.Date.ToString("yyyy-MM-dd"),
                time = meeting.Time,
                zoomLink = meeting.ZoomLink,
                status = meeting.Status
            };

            return Ok(new { message = "Live meeting added successfully", data = responseData });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Update Live Meeting
    [HttpPut("meetings/{meetingId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateLiveMeeting(Guid meetingId, [FromBody] CreateLiveMeetingDto dto)
    {
        try
        {
            var meeting = await _context.LiveMeetings.FindAsync(meetingId);
            if (meeting == null)
                return NotFound(new { message = "Meeting not found" });

            if (!DateTime.TryParse(dto.Date, out DateTime meetingDate))
                return BadRequest(new { message = "Invalid date format" });

            meeting.Title = dto.Title;
            meeting.Date = meetingDate;
            meeting.Time = dto.Time;
            meeting.ZoomLink = dto.ZoomLink;
            meeting.Status = dto.Status;

            await _context.SaveChangesAsync();
            
            var responseData = new
            {
                id = meeting.Id,
                title = meeting.Title,
                date = meeting.Date.ToString("yyyy-MM-dd"),
                time = meeting.Time,
                zoomLink = meeting.ZoomLink,
                status = meeting.Status
            };
            
            return Ok(new { message = "Meeting updated successfully", data = responseData });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Delete Live Meeting
    [HttpDelete("meetings/{meetingId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteLiveMeeting(Guid meetingId)
    {
        var meeting = await _context.LiveMeetings.FindAsync(meetingId);
        if (meeting == null)
            return NotFound(new { message = "Meeting not found" });

        _context.LiveMeetings.Remove(meeting);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Meeting deleted successfully" });
    }

    // Add Study Material
    [HttpPost("{courseId}/materials")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddStudyMaterial(Guid courseId, [FromBody] CreateStudyMaterialDto dto)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null)
            return NotFound(new { message = "Course not found" });

        var material = new StudyMaterial
        {
            CourseId = courseId,
            Type = dto.Type,
            Title = dto.Title,
            Url = dto.Url,
            FileName = dto.FileName,
            UploadDate = DateTime.UtcNow
        };

        _context.StudyMaterials.Add(material);
        await _context.SaveChangesAsync();

        var responseData = new
        {
            id = material.Id,
            type = material.Type,
            title = material.Title,
            url = material.Url,
            fileName = material.FileName,
            uploadDate = material.UploadDate.ToString("yyyy-MM-dd")
        };

        return Ok(new { message = "Study material added successfully", data = responseData });
    }

    // Update Study Material
    [HttpPut("materials/{materialId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStudyMaterial(Guid materialId, [FromBody] CreateStudyMaterialDto dto)
    {
        var material = await _context.StudyMaterials.FindAsync(materialId);
        if (material == null)
            return NotFound(new { message = "Material not found" });

        material.Type = dto.Type;
        material.Title = dto.Title;
        material.Url = dto.Url;
        material.FileName = dto.FileName;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Material updated successfully", data = material });
    }

    // Delete Study Material
    [HttpDelete("materials/{materialId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStudyMaterial(Guid materialId)
    {
        var material = await _context.StudyMaterials.FindAsync(materialId);
        if (material == null)
            return NotFound(new { message = "Material not found" });

        _context.StudyMaterials.Remove(material);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Material deleted successfully" });
    }

    // Add Syllabus Topic
    [HttpPost("{courseId}/syllabus")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddSyllabusTopic(Guid courseId, [FromBody] CreateSyllabusTopicDto dto)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course == null)
            return NotFound(new { message = "Course not found" });

        var topic = new SyllabusTopic
        {
            CourseId = courseId,
            Week = dto.Week,
            Title = dto.Title,
            Description = dto.Description,
            Materials = string.Join(",", dto.Materials ?? new List<string>())
        };

        _context.SyllabusTopics.Add(topic);
        await _context.SaveChangesAsync();

        var responseData = new
        {
            id = topic.Id,
            week = topic.Week,
            title = topic.Title,
            description = topic.Description,
            materials = topic.Materials?.Split(',').ToList() ?? new List<string>()
        };

        return Ok(new { message = "Syllabus topic added successfully", data = responseData });
    }

    // Update Syllabus Topic
    [HttpPut("syllabus/{topicId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSyllabusTopic(Guid topicId, [FromBody] CreateSyllabusTopicDto dto)
    {
        var topic = await _context.SyllabusTopics.FindAsync(topicId);
        if (topic == null)
            return NotFound(new { message = "Topic not found" });

        topic.Week = dto.Week;
        topic.Title = dto.Title;
        topic.Description = dto.Description;
        topic.Materials = string.Join(",", dto.Materials ?? new List<string>());

        await _context.SaveChangesAsync();
        return Ok(new { message = "Topic updated successfully", data = topic });
    }

    // Delete Syllabus Topic
    [HttpDelete("syllabus/{topicId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteSyllabusTopic(Guid topicId)
    {
        var topic = await _context.SyllabusTopics.FindAsync(topicId);
        if (topic == null)
            return NotFound(new { message = "Topic not found" });

        _context.SyllabusTopics.Remove(topic);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Topic deleted successfully" });
    }

    // Add Assignment
    [HttpPost("{courseId}/assignments")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddAssignment(Guid courseId, [FromBody] CreateAssignmentDto dto)
    {
        try
        {
            var course = await _context.Courses.FindAsync(courseId);
            if (course == null)
                return NotFound(new { message = "Course not found" });

            if (!DateTime.TryParse(dto.DueDate, out DateTime dueDate))
                return BadRequest(new { message = "Invalid due date format" });

            var assignment = new Assignment
            {
                CourseId = courseId,
                Title = dto.Title,
                Description = dto.Description,
                DueDate = dueDate,
                Status = dto.Status
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            var responseData = new
            {
                id = assignment.Id,
                title = assignment.Title,
                description = assignment.Description,
                dueDate = assignment.DueDate.ToString("yyyy-MM-dd"),
                status = assignment.Status
            };

            return Ok(new { message = "Assignment added successfully", data = responseData });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Update Assignment
    [HttpPut("assignments/{assignmentId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAssignment(Guid assignmentId, [FromBody] CreateAssignmentDto dto)
    {
        try
        {
            var assignment = await _context.Assignments.FindAsync(assignmentId);
            if (assignment == null)
                return NotFound(new { message = "Assignment not found" });

            if (!DateTime.TryParse(dto.DueDate, out DateTime dueDate))
                return BadRequest(new { message = "Invalid due date format" });

            assignment.Title = dto.Title;
            assignment.Description = dto.Description;
            assignment.DueDate = dueDate;
            assignment.Status = dto.Status;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Assignment updated successfully", data = assignment });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Internal server error", error = ex.Message });
        }
    }

    // Delete Assignment
    [HttpDelete("assignments/{assignmentId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteAssignment(Guid assignmentId)
    {
        var assignment = await _context.Assignments.FindAsync(assignmentId);
        if (assignment == null)
            return NotFound(new { message = "Assignment not found" });

        _context.Assignments.Remove(assignment);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Assignment deleted successfully" });
    }
}

// DTOs
public class CreateLiveMeetingDto
{
    public string Title { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string ZoomLink { get; set; } = string.Empty;
    public string Status { get; set; } = "upcoming";
}

public class CreateStudyMaterialDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? FileName { get; set; }
}

public class CreateSyllabusTopicDto
{
    public int Week { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string>? Materials { get; set; }
}

public class CreateAssignmentDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DueDate { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
}