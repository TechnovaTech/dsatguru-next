using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Services;
using DsatPsatLmsApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly AppDbContext _context;

    public PaymentController(IPaymentService paymentService, AppDbContext context)
    {
        _paymentService = paymentService;
        _context = context;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreatePaymentDto dto, [FromQuery] Guid enrollmentId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var payment = await _paymentService.CreateAsync(dto, userId, enrollmentId);
        return CreatedAtAction(nameof(GetById), new { id = payment.Id }, 
            new { message = "Payment created successfully", data = payment });
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var payment = await _paymentService.GetByIdAsync(id);
        return Ok(new { message = "Payment fetched successfully", data = payment });
    }

    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMyPayments()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var payments = await _context.Payments
            .Include(p => p.Enrollment)
            .ThenInclude(e => e.Course)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                id = p.Id,
                amount = p.Amount,
                currency = p.Currency,
                status = p.Status.ToString(),
                paymentGateway = p.PaymentGateway,
                paymentIntentId = p.PaymentIntentId,
                receiptUrl = p.ReceiptUrl,
                createdAt = p.CreatedAt,
                courseTitle = p.Enrollment.Course.Title,
                courseId = p.Enrollment.CourseId,
                courseType = p.Enrollment.Course.Type
            })
            .ToListAsync();

        return Ok(new { success = true, data = payments });
    }
}