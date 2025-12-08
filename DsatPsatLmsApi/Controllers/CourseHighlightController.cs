using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/admin/course-highlights")]
public class CourseHighlightController : ControllerBase
{
    private readonly ICourseHighlightService _courseHighlightService;

    public CourseHighlightController(ICourseHighlightService courseHighlightService)
    {
        _courseHighlightService = courseHighlightService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCourseHighlightDto dto, [FromQuery] Guid courseId)
    {
        var highlight = await _courseHighlightService.CreateAsync(dto, courseId);
        return CreatedAtAction(nameof(GetById), new { id = highlight.Id }, 
            new { message = "Course highlight created successfully", data = highlight });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var highlight = await _courseHighlightService.GetByIdAsync(id);
        return Ok(new { message = "Course highlight fetched successfully", data = highlight });
    }
}

[ApiController]
[Route("api/admin/course-schedules")]
public class CourseScheduleController : ControllerBase
{
    private readonly ICourseScheduleService _courseScheduleService;

    public CourseScheduleController(ICourseScheduleService courseScheduleService)
    {
        _courseScheduleService = courseScheduleService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCourseScheduleDto dto, [FromQuery] Guid courseId)
    {
        var schedule = await _courseScheduleService.CreateAsync(dto, courseId);
        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, 
            new { message = "Course schedule created successfully", data = schedule });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var schedule = await _courseScheduleService.GetByIdAsync(id);
        return Ok(new { message = "Course schedule fetched successfully", data = schedule });
    }
}

[ApiController]
[Route("api/admin/course-faqs")]
public class CourseFAQController : ControllerBase
{
    private readonly ICourseFAQService _courseFAQService;

    public CourseFAQController(ICourseFAQService courseFAQService)
    {
        _courseFAQService = courseFAQService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCourseFAQDto dto, [FromQuery] Guid courseId)
    {
        var faq = await _courseFAQService.CreateAsync(dto, courseId);
        return CreatedAtAction(nameof(GetById), new { id = faq.Id }, 
            new { message = "Course FAQ created successfully", data = faq });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var faq = await _courseFAQService.GetByIdAsync(id);
        return Ok(new { message = "Course FAQ fetched successfully", data = faq });
    }
}