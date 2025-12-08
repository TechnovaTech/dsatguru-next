using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthCheckController : ControllerBase
{
    [HttpGet]
    [Authorize]
    public IActionResult CheckAuth()
    {
        try
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("id")?.Value;
            var roles = User.Claims.Where(c => c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                .Select(c => c.Value)
                .ToList();
            
            return Ok(new { 
                success = true, 
                message = "Authentication check successful",
                userId = userIdClaim,
                roles = roles,
                claims = claims
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Auth check error: {ex.Message}" });
        }
    }
    
    [HttpGet("public")]
    [AllowAnonymous]
    public IActionResult PublicCheck()
    {
        return Ok(new { success = true, message = "Public endpoint is working" });
    }
}