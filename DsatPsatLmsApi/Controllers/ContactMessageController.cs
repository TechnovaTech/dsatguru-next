using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactMessageController : ControllerBase
{
    private readonly IContactMessageService _contactMessageService;

    public ContactMessageController(IContactMessageService contactMessageService)
    {
        _contactMessageService = contactMessageService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContactMessageDto dto)
    {
        var message = await _contactMessageService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = message.Id }, 
            new { message = "Contact message created successfully", data = message });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var messages = await _contactMessageService.GetAllAsync();
        return Ok(new { message = "Contact messages fetched successfully", data = messages });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var message = await _contactMessageService.GetByIdAsync(id);
        return Ok(new { message = "Contact message fetched successfully", data = message });
    }
}

[ApiController]
[Route("api/admin/zoom-sessions")]
public class ZoomSessionController : ControllerBase
{
    private readonly IZoomSessionService _zoomSessionService;

    public ZoomSessionController(IZoomSessionService zoomSessionService)
    {
        _zoomSessionService = zoomSessionService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] DTOs.CreateZoomSessionDto dto, [FromQuery] Guid courseId, [FromQuery] Guid? scheduleId = null)
    {
        var session = await _zoomSessionService.CreateAsync(dto, courseId, scheduleId);
        return CreatedAtAction(nameof(GetById), new { id = session.Id }, 
            new { message = "Zoom session created successfully", data = session });
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var session = await _zoomSessionService.GetByIdAsync(id);
        return Ok(new { message = "Zoom session fetched successfully", data = session });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var sessions = await _zoomSessionService.GetAllAsync();
        return Ok(new { message = "Zoom sessions fetched successfully", data = sessions });
    }
}







