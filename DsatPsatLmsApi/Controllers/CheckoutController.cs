using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
    public class CheckoutController : ControllerBase
    {
        private readonly ICheckoutService _checkoutService;

        public CheckoutController(ICheckoutService checkoutService)
        {
            _checkoutService = checkoutService;
        }

    [HttpPost("create-session")]
    [Authorize]
    public async Task<IActionResult> CreateSession([FromBody] CreateSessionDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.SelectMany(x => x.Value.Errors.Select(e => e.ErrorMessage)).ToList();
                Console.WriteLine($"Model validation failed: {string.Join(", ", errors)}");
                return BadRequest(new { message = "Validation failed", errors });
            }
            
            Console.WriteLine($"Received DTO: CourseId={dto.CourseId}, ScheduleId={dto.ScheduleId}, SuccessUrl={dto.SuccessUrl}, CancelUrl={dto.CancelUrl}");
            
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var session = await _checkoutService.CreateSessionAsync(dto, userId);
            return Ok(new { message = "Checkout session created", data = session });
        }
        catch (NotFoundException ex)
        {
            Console.WriteLine($"NotFoundException: {ex.Message}");
            return NotFound(new { message = ex.Message });
        }
        catch (Stripe.StripeException ex)
        {
            Console.WriteLine($"StripeException: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine($"InvalidOperationException: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"General Exception: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("confirm-session")]
    [Authorize]
    public async Task<IActionResult> ConfirmSession([FromBody] ConfirmSessionDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _checkoutService.ConfirmSessionAsync(dto.SessionId, userId);
            return Ok(new { message = "Checkout session confirmed", data = result });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Stripe.StripeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("cancel-session")]
    [Authorize]
    public async Task<IActionResult> CancelSession([FromBody] ConfirmSessionDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _checkoutService.CancelSessionAsync(dto.SessionId, userId);
            return Ok(new { message = "Checkout session cancelled", data = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}