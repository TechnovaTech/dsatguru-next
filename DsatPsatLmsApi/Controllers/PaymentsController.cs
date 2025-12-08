using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Controllers;

[ApiController]
[Route("api/admin/[controller]")]
[Authorize(Roles = "Admin")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] string? status = null)
    {
        var query = _context.Payments
            .Include(p => p.Enrollment)
            .ThenInclude(e => e.Course)
            .Include(p => p.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PaymentStatus>(status, true, out var st))
        {
            query = query.Where(p => p.Status == st);
        }

        var list = await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                id = p.Id,
                userId = p.UserId,
                studentName = p.User.Name,
                studentEmail = p.User.Email,
                enrollmentId = p.EnrollmentId,
                courseId = p.Enrollment.CourseId,
                courseName = p.Enrollment.Course.Title,
                amount = p.Amount,
                currency = p.Currency,
                status = p.Status.ToString(),
                method = p.PaymentGateway,
                transactionId = p.PaymentIntentId,
                createdAt = p.CreatedAt,
                updatedAt = p.UpdatedAt,
                receiptUrl = p.ReceiptUrl
            })
            .ToListAsync();

        return Ok(new { success = true, data = list });
    }
}