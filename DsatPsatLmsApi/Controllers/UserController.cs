using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var user = await _userService.GetByIdAsync(userId);
            return Ok(new { message = "Profile fetched successfully", user = user });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}