using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
public class ServiceController : ControllerBase
{
    private readonly IServiceService _serviceService;

    public ServiceController(IServiceService serviceService)
    {
        _serviceService = serviceService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateServiceDto dto)
    {
        var service = await _serviceService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = service.Id }, 
            new { message = "Service created successfully", data = service });
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceDto dto)
    {
        var updated = await _serviceService.UpdateAsync(id, dto);
        return Ok(new { message = "Service updated successfully", data = updated });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _serviceService.DeleteAsync(id);
        return Ok(new { message = "Service deleted successfully" });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var services = await _serviceService.GetAllAsync();
        return Ok(new { message = "Services fetched successfully", data = services });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var service = await _serviceService.GetByIdAsync(id);
        return Ok(new { message = "Service fetched successfully", data = service });
    }
}

[ApiController]
[Route("api/admin/service-packages")]
public class ServicePackageController : ControllerBase
{
    private readonly IServicePackageService _servicePackageService;

    public ServicePackageController(IServicePackageService servicePackageService)
    {
        _servicePackageService = servicePackageService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateServicePackageDto dto, [FromQuery] Guid serviceId)
    {
        var package = await _servicePackageService.CreateAsync(dto, serviceId);
        return CreatedAtAction(nameof(GetById), new { id = package.Id }, 
            new { message = "Service package created successfully", data = package });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var package = await _servicePackageService.GetByIdAsync(id);
        return Ok(new { message = "Service package fetched successfully", data = package });
    }
}

[ApiController]
[Route("api/admin/service-highlights")]
public class ServiceHighlightController : ControllerBase
{
    private readonly IServiceHighlightService _serviceHighlightService;

    public ServiceHighlightController(IServiceHighlightService serviceHighlightService)
    {
        _serviceHighlightService = serviceHighlightService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateServiceHighlightDto dto, [FromQuery] Guid serviceId)
    {
        var highlight = await _serviceHighlightService.CreateAsync(dto, serviceId);
        return CreatedAtAction(nameof(GetById), new { id = highlight.Id }, 
            new { message = "Service highlight created successfully", data = highlight });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var highlight = await _serviceHighlightService.GetByIdAsync(id);
        return Ok(new { message = "Service highlight fetched successfully", data = highlight });
    }
}