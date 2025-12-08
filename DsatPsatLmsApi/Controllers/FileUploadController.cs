using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class FileUploadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public FileUploadController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "No file uploaded" });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(extension))
            return BadRequest(new { success = false, message = "Invalid file type" });

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest(new { success = false, message = "File too large" });

        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "images");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/images/{fileName}";
        return Ok(new { success = true, url = fileUrl });
    }
}