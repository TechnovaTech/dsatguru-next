using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Services;

public class ServiceService : IServiceService
{
    private readonly AppDbContext _context;
    public ServiceService(AppDbContext context) => _context = context;

    public async Task<ServiceDto> CreateAsync(CreateServiceDto dto)
    {
        var service = new Service
        {
            Slug = dto.Slug,
            Title = dto.Title,
            Subtitle = dto.Subtitle,
            Description = dto.Description,
            PhoneNumber = dto.PhoneNumber,
            BannerUrl = dto.BannerUrl
        };
        _context.Services.Add(service);
        await _context.SaveChangesAsync();
        return MapToDto(service);
    }

    public async Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceDto dto)
    {
        var service = await _context.Services.FindAsync(id) ?? throw new NotFoundException("Service not found");
        if (dto.Slug != null) service.Slug = dto.Slug;
        if (dto.Title != null) service.Title = dto.Title;
        if (dto.Subtitle != null) service.Subtitle = dto.Subtitle;
        if (dto.Description != null) service.Description = dto.Description;
        if (dto.PhoneNumber != null) service.PhoneNumber = dto.PhoneNumber;
        if (dto.BannerUrl != null) service.BannerUrl = dto.BannerUrl;
        service.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapToDto(service);
    }

    public async Task DeleteAsync(Guid id)
    {
        var service = await _context.Services.FindAsync(id) ?? throw new NotFoundException("Service not found");
        _context.Services.Remove(service);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ServiceDto>> GetAllAsync()
    {
        var services = await _context.Services.Include(s => s.Packages).Include(s => s.Highlights).ToListAsync();
        return services.Select(MapToDto).ToList();
    }

    public async Task<ServiceDto> GetByIdAsync(Guid id)
    {
        var service = await _context.Services.Include(s => s.Packages).Include(s => s.Highlights).FirstOrDefaultAsync(s => s.Id == id) ?? throw new NotFoundException("Service not found");
        return MapToDto(service);
    }

    private static ServiceDto MapToDto(Service service) => new()
    {
        Id = service.Id,
        Slug = service.Slug,
        Title = service.Title,
        Subtitle = service.Subtitle,
        Description = service.Description,
        PhoneNumber = service.PhoneNumber,
        BannerUrl = service.BannerUrl,
        CreatedAt = service.CreatedAt,
        Packages = service.Packages?.Select(p => new ServicePackageDto
        {
            Id = p.Id,
            Title = p.Title,
            Label = p.Label,
            Price = p.Price,
            Features = p.Features,
            Order = p.Order,
            IsCustomPlan = p.IsCustomPlan
        }).ToList() ?? new(),
        Highlights = service.Highlights?.Select(h => new ServiceHighlightDto
        {
            Id = h.Id,
            Type = h.Type.ToString(),
            Title = h.Title,
            Content = h.Content,
            ImageUrl = h.ImageUrl
        }).ToList() ?? new()
    };
}

public class ServicePackageService : IServicePackageService
{
    private readonly AppDbContext _context;
    public ServicePackageService(AppDbContext context) => _context = context;

    public async Task<ServicePackageDto> CreateAsync(CreateServicePackageDto dto, Guid serviceId)
    {
        var package = new ServicePackage
        {
            ServiceId = serviceId,
            Title = dto.Title,
            Label = dto.Label,
            Price = dto.Price,
            Features = dto.Features,
            Order = dto.Order,
            IsCustomPlan = dto.IsCustomPlan
        };
        _context.ServicePackages.Add(package);
        await _context.SaveChangesAsync();
        return new ServicePackageDto
        {
            Id = package.Id,
            Title = package.Title,
            Label = package.Label,
            Price = package.Price,
            Features = package.Features,
            Order = package.Order,
            IsCustomPlan = package.IsCustomPlan
        };
    }

    public async Task<ServicePackageDto> GetByIdAsync(Guid id)
    {
        var package = await _context.ServicePackages.FindAsync(id) ?? throw new NotFoundException("Service package not found");
        return new ServicePackageDto
        {
            Id = package.Id,
            Title = package.Title,
            Label = package.Label,
            Price = package.Price,
            Features = package.Features,
            Order = package.Order,
            IsCustomPlan = package.IsCustomPlan
        };
    }
}

public class ServiceHighlightService : IServiceHighlightService
{
    private readonly AppDbContext _context;
    public ServiceHighlightService(AppDbContext context) => _context = context;

    public async Task<ServiceHighlightDto> CreateAsync(CreateServiceHighlightDto dto, Guid serviceId)
    {
        var highlight = new ServiceHighlight
        {
            ServiceId = serviceId,
            Type = Enum.Parse<ServiceHighlightType>(dto.Type, true),
            Title = dto.Title,
            Content = dto.Content,
            ImageUrl = dto.ImageUrl
        };
        _context.ServiceHighlights.Add(highlight);
        await _context.SaveChangesAsync();
        return new ServiceHighlightDto
        {
            Id = highlight.Id,
            Type = highlight.Type.ToString(),
            Title = highlight.Title,
            Content = highlight.Content,
            ImageUrl = highlight.ImageUrl
        };
    }

    public async Task<ServiceHighlightDto> GetByIdAsync(Guid id)
    {
        var highlight = await _context.ServiceHighlights.FindAsync(id) ?? throw new NotFoundException("Service highlight not found");
        return new ServiceHighlightDto
        {
            Id = highlight.Id,
            Type = highlight.Type.ToString(),
            Title = highlight.Title,
            Content = highlight.Content,
            ImageUrl = highlight.ImageUrl
        };
    }
}

public class ContactMessageService : IContactMessageService
{
    private readonly AppDbContext _context;
    public ContactMessageService(AppDbContext context) => _context = context;

    public async Task<ContactMessageDto> CreateAsync(CreateContactMessageDto dto)
    {
        var message = new ContactMessage
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone,
            Subject = dto.Subject,
            Message = dto.Message,
            SourcePage = dto.SourcePage
        };
        _context.ContactMessages.Add(message);
        await _context.SaveChangesAsync();
        return MapToDto(message);
    }

    public async Task<List<ContactMessageDto>> GetAllAsync()
    {
        var messages = await _context.ContactMessages.ToListAsync();
        return messages.Select(MapToDto).ToList();
    }

    public async Task<ContactMessageDto> GetByIdAsync(Guid id)
    {
        var message = await _context.ContactMessages.FindAsync(id) ?? throw new NotFoundException("Contact message not found");
        return MapToDto(message);
    }

    private static ContactMessageDto MapToDto(ContactMessage message) => new()
    {
        Id = message.Id,
        Name = message.Name,
        Email = message.Email,
        Phone = message.Phone,
        Subject = message.Subject,
        Message = message.Message,
        SourcePage = message.SourcePage,
        Responded = message.Responded,
        CreatedAt = message.CreatedAt
    };
}

public class ZoomSessionService : IZoomSessionService
{
    private readonly AppDbContext _context;
    public ZoomSessionService(AppDbContext context) => _context = context;

    public async Task<ZoomSessionDto> CreateAsync(CreateZoomSessionDto dto, Guid courseId, Guid? scheduleId)
    {
        var session = new ZoomSession
        {
            CourseId = courseId,
            ScheduleId = scheduleId,
            ZoomLink = dto.ZoomLink,
            MeetingId = dto.MeetingId,
            Passcode = dto.Passcode,
            SessionDate = dto.SessionDate,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime
        };
        _context.ZoomSessions.Add(session);
        await _context.SaveChangesAsync();
        return MapToDto(session);
    }

    public async Task<ZoomSessionDto> GetByIdAsync(Guid id)
    {
        var session = await _context.ZoomSessions.FindAsync(id) ?? throw new NotFoundException("Zoom session not found");
        return MapToDto(session);
    }

    public async Task<List<ZoomSessionDto>> GetAllAsync()
    {
        var sessions = await _context.ZoomSessions.ToListAsync();
        return sessions.Select(MapToDto).ToList();
    }

    private static ZoomSessionDto MapToDto(ZoomSession session) => new()
    {
        Id = session.Id,
        CourseId = session.CourseId,
        ScheduleId = session.ScheduleId,
        ZoomLink = session.ZoomLink,
        MeetingId = session.MeetingId,
        Passcode = session.Passcode,
        SessionDate = session.SessionDate,
        StartTime = session.StartTime,
        EndTime = session.EndTime,
        IsSent = session.IsSent
    };
}

public class EnrollmentService : IEnrollmentService
{
    private readonly AppDbContext _context;
    public EnrollmentService(AppDbContext context) => _context = context;

    public async Task<EnrollmentDto> CreateAsync(CreateEnrollmentDto dto, Guid userId)
    {
        var enrollment = new CourseEnrollment
        {
            UserId = userId,
            CourseId = dto.CourseId
        };
        _context.CourseEnrollments.Add(enrollment);
        await _context.SaveChangesAsync();
        return new EnrollmentDto
        {
            Id = enrollment.Id,
            UserId = enrollment.UserId,
            CourseId = enrollment.CourseId,
            EnrolledAt = enrollment.EnrolledAt
        };
    }

    public async Task<EnrollmentDto> GetByIdAsync(Guid id)
    {
        var enrollment = await _context.CourseEnrollments.Include(e => e.Course).FirstOrDefaultAsync(e => e.Id == id) ?? throw new NotFoundException("Enrollment not found");
        return new EnrollmentDto
        {
            Id = enrollment.Id,
            UserId = enrollment.UserId,
            CourseId = enrollment.CourseId,
            EnrolledAt = enrollment.EnrolledAt
        };
    }

    public async Task<List<EnrollmentDto>> GetByUserIdAsync(Guid userId)
    {
        var enrollments = await _context.CourseEnrollments
            .Include(e => e.Course)
            .ThenInclude(c => c.Highlights)
            .Include(e => e.Course)
            .ThenInclude(c => c.Schedules)
            .Where(e => e.UserId == userId)
            .ToListAsync();
        
        return enrollments.Select(e => new EnrollmentDto
        {
            Id = e.Id,
            UserId = e.UserId,
            CourseId = e.CourseId,
            EnrolledAt = e.EnrolledAt,
            Course = new CourseDto
            {
                Id = e.Course.Id,
                Title = e.Course.Title,
                Description = e.Course.Description,
                Type = e.Course.Type,
                Price = e.Course.Price,
                CreatedAt = e.Course.CreatedAt,
                Highlights = e.Course.Highlights?.OrderBy(h => h.SequenceOrder).Select(h => new CourseHighlightDto
                {
                    Id = h.Id,
                    Text = h.Text,
                    SequenceOrder = h.SequenceOrder
                }).ToList() ?? new(),
                Schedules = e.Course.Schedules?.Select(s => new CourseScheduleDto
                {
                    Id = s.Id,
                    Day = s.Day,
                    Time = s.Time
                }).ToList() ?? new()
            }
        }).ToList();
    }
}

public class PaymentServiceImpl : IPaymentService
{
    private readonly AppDbContext _context;
    public PaymentServiceImpl(AppDbContext context) => _context = context;

        public async Task<PaymentDto> CreateAsync(CreatePaymentDto dto, Guid userId, Guid enrollmentId)
        {
            var payment = new Payment
            {
                UserId = userId,
                EnrollmentId = enrollmentId,
                Amount = dto.Amount,
                Currency = dto.Currency,
                PaymentIntentId = dto.PaymentIntentId,
                Status = Enum.TryParse<PaymentStatus>(dto.Status ?? string.Empty, true, out var s) ? s : PaymentStatus.Pending,
                ReceiptUrl = dto.ReceiptUrl
            };
            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();
            return MapToDto(payment);
        }

    public async Task<PaymentDto> GetByIdAsync(Guid id)
    {
        var payment = await _context.Payments.FindAsync(id) ?? throw new NotFoundException("Payment not found");
        return MapToDto(payment);
    }

    private static PaymentDto MapToDto(Payment payment) => new()
    {
        Id = payment.Id,
        UserId = payment.UserId,
        EnrollmentId = payment.EnrollmentId,
        Amount = payment.Amount,
        Currency = payment.Currency,
        PaymentGateway = payment.PaymentGateway,
        PaymentIntentId = payment.PaymentIntentId,
        Status = payment.Status.ToString(),
        ReceiptUrl = payment.ReceiptUrl,
        CreatedAt = payment.CreatedAt
    };
}

public class CheckoutService : ICheckoutService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        
        public CheckoutService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }
        
        public async Task<object> CreateSessionAsync(CreateSessionDto dto, Guid userId)
        {
            try
            {
                var course = await _context.Courses.FindAsync(dto.CourseId);
                if (course == null) throw new NotFoundException("Course not found");

                var secretKey = _configuration["Stripe:SecretKey"];
                if (string.IsNullOrWhiteSpace(secretKey))
                {
                    if (string.IsNullOrWhiteSpace(dto.SuccessUrl) || string.IsNullOrWhiteSpace(dto.CancelUrl))
                    {
                        throw new InvalidOperationException("Invalid success or cancel URL");
                    }
                    var mockSessionId = $"mock_{dto.CourseId}_{Guid.NewGuid():N}";
                    var successUrl = dto.SuccessUrl.Replace("{CHECKOUT_SESSION_ID}", mockSessionId);
                    return new { sessionId = mockSessionId, sessionUrl = successUrl };
                }

                Stripe.StripeConfiguration.ApiKey = secretKey;

                var basePrice = course.Price;
                var discounted = course.DiscountedPrice.HasValue && course.DiscountedPrice.Value > 0m
                    ? course.DiscountedPrice.Value
                    : (decimal?)null;
                var priceAmount = discounted.HasValue && discounted.Value < basePrice ? discounted.Value : basePrice;
                if (priceAmount <= 0m)
                {
                    throw new InvalidOperationException("Course price is not configured");
                }

                var lineItem = new Stripe.Checkout.SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new Stripe.Checkout.SessionLineItemPriceDataOptions
                    {
                        UnitAmount = (long)(priceAmount * 100m),
                        Currency = "usd",
                        ProductData = new Stripe.Checkout.SessionLineItemPriceDataProductDataOptions
                        {
                            Name = course.Title,
                            Description = (course.Description ?? string.Empty).Length > 120
                                ? (course.Description ?? string.Empty).Substring(0, 120)
                                : (course.Description ?? string.Empty)
                        }
                    }
                };

                if (string.IsNullOrWhiteSpace(dto.SuccessUrl) || string.IsNullOrWhiteSpace(dto.CancelUrl))
                {
                    throw new InvalidOperationException("Invalid success or cancel URL");
                }

                var options = new Stripe.Checkout.SessionCreateOptions
                {
                    Mode = "payment",
                    SuccessUrl = dto.SuccessUrl,
                    CancelUrl = dto.CancelUrl,
                    PaymentMethodTypes = new List<string> { "card" },
                    LineItems = new List<Stripe.Checkout.SessionLineItemOptions> { lineItem },
                    ClientReferenceId = userId.ToString(),
                    Metadata = new Dictionary<string, string>
                    {
                        { "courseId", dto.CourseId.ToString() },
                        { "userId", userId.ToString() },
                        { "scheduleId", dto.ScheduleId?.ToString() ?? string.Empty }
                    }
                };

                options.PaymentIntentData = new Stripe.Checkout.SessionPaymentIntentDataOptions
                {
                    Metadata = new Dictionary<string, string>
                    {
                        { "courseId", dto.CourseId.ToString() },
                        { "userId", userId.ToString() },
                        { "scheduleId", dto.ScheduleId?.ToString() ?? string.Empty }
                    }
                };

                var sessionService = new Stripe.Checkout.SessionService();
                var session = await sessionService.CreateAsync(options);

                return new { sessionId = session.Id, sessionUrl = session.Url };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating checkout session: {ex.Message}");
                throw;
            }
        }

        public async Task<object> CancelSessionAsync(string sessionId, Guid userId)
        {
            try
            {
                var secretKey = _configuration["Stripe:SecretKey"];
                if (string.IsNullOrWhiteSpace(secretKey))
                {
                    // Development mode: parse mock sessionId in format "mock_{courseId}_{guid}"
                    Guid courseId;
                    var parts = (sessionId ?? string.Empty).Split('_');
                    if (parts.Length >= 3 && Guid.TryParse(parts[1], out courseId))
                    {
                        var existingEnrollment = await _context.CourseEnrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);
                        if (existingEnrollment == null)
                        {
                            existingEnrollment = new CourseEnrollment { UserId = userId, CourseId = courseId };
                            _context.CourseEnrollments.Add(existingEnrollment);
                            await _context.SaveChangesAsync();
                        }

                        var mockPayment = await _context.Payments.FirstOrDefaultAsync(p => p.PaymentIntentId == sessionId);
                        if (mockPayment == null)
                        {
                            mockPayment = new Payment
                            {
                                UserId = userId,
                                EnrollmentId = existingEnrollment.Id,
                                Amount = 0m,
                                Currency = "USD",
                                PaymentIntentId = sessionId,
                                Status = PaymentStatus.Cancelled,
                                PaymentGateway = "Mock"
                            };
                            _context.Payments.Add(mockPayment);
                            await _context.SaveChangesAsync();
                        }
                    }

                    return new { message = "Payment cancelled and recorded" };
                }

                Stripe.StripeConfiguration.ApiKey = secretKey;
                var sessionService = new Stripe.Checkout.SessionService();
                var session = await sessionService.GetAsync(sessionId);

                if (session == null)
                {
                    throw new NotFoundException("Checkout session not found");
                }

                var paymentIntentId = session.PaymentIntentId ?? sessionId;
                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.PaymentIntentId == paymentIntentId);
                if (existingPayment != null)
                {
                    return new { message = "Payment cancellation already recorded" };
                }

                if (session.Metadata != null && session.Metadata.ContainsKey("courseId"))
                {
                    var courseId = Guid.Parse(session.Metadata["courseId"]);
                    var course = await _context.Courses.FindAsync(courseId) ?? throw new NotFoundException("Course not found");

                    var existingEnrollment = await _context.CourseEnrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);
                    if (existingEnrollment == null)
                    {
                        existingEnrollment = new CourseEnrollment { UserId = userId, CourseId = courseId };
                        _context.CourseEnrollments.Add(existingEnrollment);
                        await _context.SaveChangesAsync();
                    }

                    var payment = new Payment
                    {
                        UserId = userId,
                        EnrollmentId = existingEnrollment.Id,
                        Amount = (session.AmountTotal ?? 0) / 100m,
                        Currency = session.Currency?.ToUpper() ?? "USD",
                        PaymentIntentId = paymentIntentId,
                        Status = PaymentStatus.Cancelled,
                        PaymentGateway = "Stripe"
                    };
                    _context.Payments.Add(payment);
                    await _context.SaveChangesAsync();
                }

                return new { message = "Payment cancelled and recorded" };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error cancelling session: {ex.Message}");
                throw;
            }
        }

        public async Task<object> ConfirmSessionAsync(string sessionId, Guid userId)
        {
            try
            {
                var secretKey = _configuration["Stripe:SecretKey"];
                if (string.IsNullOrWhiteSpace(secretKey))
                    throw new InvalidOperationException("Stripe SecretKey is not configured");

                Stripe.StripeConfiguration.ApiKey = secretKey;

                var sessionService = new Stripe.Checkout.SessionService();
                var session = await sessionService.GetAsync(sessionId);

                if (session == null)
                    throw new NotFoundException("Checkout session not found");

                var paid = string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(session.Status, "complete", StringComparison.OrdinalIgnoreCase);
                if (!paid)
                    throw new InvalidOperationException("Payment not completed");

                var courseId = Guid.Parse(session.Metadata["courseId"]);
                Guid? scheduleId = null;
                if (!string.IsNullOrEmpty(session.Metadata["scheduleId"]))
                    scheduleId = Guid.Parse(session.Metadata["scheduleId"]);

                var course = await _context.Courses.FindAsync(courseId) ?? throw new NotFoundException("Course not found");

                var existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.PaymentIntentId == session.PaymentIntentId);
                if (existingPayment != null)
                {
                    return new { status = "already_recorded" };
                }

                var existingEnrollment = await _context.CourseEnrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.CourseId == courseId);
                if (existingEnrollment == null)
                {
                    var enrollment = new CourseEnrollment
                    {
                        UserId = userId,
                        CourseId = courseId
                    };
                    _context.CourseEnrollments.Add(enrollment);
                    await _context.SaveChangesAsync();
                    existingEnrollment = enrollment;
                }

                if (string.Equals(course.Type, "question_bank", StringComparison.OrdinalIgnoreCase))
                {
                    var existingQbEnrollment = await _context.QuestionBankEnrollments.FirstOrDefaultAsync(e => e.UserId == userId && e.QuestionBankId == courseId);
                    if (existingQbEnrollment == null)
                    {
                        var qbEnrollment = new QuestionBankEnrollment
                        {
                            UserId = userId,
                            QuestionBankId = courseId
                        };
                        _context.QuestionBankEnrollments.Add(qbEnrollment);
                        await _context.SaveChangesAsync();
                    }
                }

                var receiptUrl = string.Empty;
                try
                {
                    var chargeService = new Stripe.ChargeService();
                    var charges = await chargeService.ListAsync(new Stripe.ChargeListOptions
                    {
                        PaymentIntent = session.PaymentIntentId,
                        Limit = 1
                    });
                    if (charges?.Data != null && charges.Data.Count > 0)
                    {
                        receiptUrl = charges.Data[0].ReceiptUrl ?? string.Empty;
                    }
                }
                catch { }

                var payment = new Payment
                {
                    UserId = userId,
                    EnrollmentId = existingEnrollment.Id,
                    Amount = (decimal)((session.AmountTotal ?? 0L) / 100.0),
                    Currency = session.Currency ?? "usd",
                    PaymentIntentId = session.PaymentIntentId ?? string.Empty,
                    Status = PaymentStatus.Succeeded,
                    PaymentGateway = "stripe",
                    ReceiptUrl = string.IsNullOrWhiteSpace(receiptUrl) ? null : receiptUrl
                };
                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                return new { status = "recorded" };
            }
            catch
            {
                throw;
            }
        }
    }

public class WebhookService : IWebhookService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEnrollmentService _enrollmentService;
    private readonly IPaymentService _paymentService;
    
    public WebhookService(AppDbContext context, IConfiguration configuration, 
        IEnrollmentService enrollmentService, IPaymentService paymentService)
    {
        _context = context;
        _configuration = configuration;
        _enrollmentService = enrollmentService;
        _paymentService = paymentService;
    }
    
        public async Task HandleStripeWebhookAsync(HttpRequest request)
        {
        var json = await new StreamReader(request.Body).ReadToEndAsync();
        
        try
        {
            // Configure Stripe API key
            Stripe.StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"];
            
            // Verify webhook signature
            var stripeEvent = Stripe.EventUtility.ConstructEvent(
                json,
                request.Headers["Stripe-Signature"],
                _configuration["Stripe:WebhookSecret"]
            );
            
            // Handle the event
            if (stripeEvent.Type == Stripe.Events.CheckoutSessionCompleted)
            {
                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                
                if (session != null)
                {
                    // Extract metadata
                    var courseId = Guid.Parse(session.Metadata["courseId"]);
                    var userId = Guid.Parse(session.Metadata["userId"]);
                    Guid? scheduleId = null;
                    
                    if (!string.IsNullOrEmpty(session.Metadata["scheduleId"]))
                    {
                        scheduleId = Guid.Parse(session.Metadata["scheduleId"]);
                    }
                    
                    // Create enrollment
                    var enrollmentDto = new CreateEnrollmentDto
                    {
                        CourseId = courseId,
                        ScheduleId = scheduleId ?? null
                    };
                    
                    var enrollment = await _enrollmentService.CreateAsync(enrollmentDto, userId);
                    
                    // Create payment record
                    var receiptUrl = string.Empty;
                    try
                    {
                        var chargeService = new Stripe.ChargeService();
                        var charges = await chargeService.ListAsync(new Stripe.ChargeListOptions
                        {
                            PaymentIntent = session.PaymentIntentId,
                            Limit = 1
                        });
                        if (charges?.Data != null && charges.Data.Count > 0)
                        {
                            receiptUrl = charges.Data[0].ReceiptUrl ?? string.Empty;
                        }
                    }
                    catch { }

                    var paymentDto = new CreatePaymentDto
                    {
                        Amount = (decimal)((session.AmountTotal ?? 0L) / 100.0),
                        Currency = session.Currency,
                        PaymentIntentId = session.PaymentIntentId ?? "",
                        Status = nameof(PaymentStatus.Succeeded),
                        ReceiptUrl = string.IsNullOrWhiteSpace(receiptUrl) ? null : receiptUrl
                    };
                    
                    await _paymentService.CreateAsync(paymentDto, userId, enrollment.Id);
                }
            }
            else if (stripeEvent.Type == Stripe.Events.CheckoutSessionExpired)
            {
                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                if (session != null)
                {
                    var courseId = Guid.Parse(session.Metadata["courseId"]);
                    var userId = Guid.Parse(session.Metadata["userId"]);
                    Guid? scheduleId = null;
                    if (!string.IsNullOrEmpty(session.Metadata["scheduleId"]))
                    {
                        scheduleId = Guid.Parse(session.Metadata["scheduleId"]);
                    }

                    var enrollmentDto = new CreateEnrollmentDto
                    {
                        CourseId = courseId,
                        ScheduleId = scheduleId ?? null
                    };
                    var enrollment = await _enrollmentService.CreateAsync(enrollmentDto, userId);

                    var paymentDto = new CreatePaymentDto
                    {
                        Amount = (decimal)((session.AmountTotal ?? 0L) / 100.0),
                        Currency = session.Currency,
                        PaymentIntentId = session.PaymentIntentId ?? "",
                        Status = nameof(PaymentStatus.Cancelled),
                        ReceiptUrl = null
                    };
                    await _paymentService.CreateAsync(paymentDto, userId, enrollment.Id);
                }
            }
            else if (stripeEvent.Type == Stripe.Events.CheckoutSessionAsyncPaymentFailed)
            {
                var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                if (session != null)
                {
                    var courseId = Guid.Parse(session.Metadata["courseId"]);
                    var userId = Guid.Parse(session.Metadata["userId"]);
                    Guid? scheduleId = null;
                    if (!string.IsNullOrEmpty(session.Metadata["scheduleId"]))
                    {
                        scheduleId = Guid.Parse(session.Metadata["scheduleId"]);
                    }

                    var enrollmentDto = new CreateEnrollmentDto
                    {
                        CourseId = courseId,
                        ScheduleId = scheduleId ?? null
                    };
                    var enrollment = await _enrollmentService.CreateAsync(enrollmentDto, userId);

                    var paymentDto = new CreatePaymentDto
                    {
                        Amount = (decimal)((session.AmountTotal ?? 0L) / 100.0),
                        Currency = session.Currency,
                        PaymentIntentId = session.PaymentIntentId ?? "",
                        Status = nameof(PaymentStatus.Failed),
                        ReceiptUrl = null
                    };
                    await _paymentService.CreateAsync(paymentDto, userId, enrollment.Id);
                }
            }
            else if (stripeEvent.Type == Stripe.Events.PaymentIntentPaymentFailed)
            {
                var intent = stripeEvent.Data.Object as Stripe.PaymentIntent;
                if (intent != null)
                {
                    if (intent.Metadata != null && intent.Metadata.TryGetValue("courseId", out var courseIdStr) && intent.Metadata.TryGetValue("userId", out var userIdStr))
                    {
                        var courseId = Guid.Parse(courseIdStr);
                        var userId = Guid.Parse(userIdStr);
                        Guid? scheduleId = null;
                        if (intent.Metadata.TryGetValue("scheduleId", out var scheduleIdStr) && !string.IsNullOrEmpty(scheduleIdStr))
                        {
                            scheduleId = Guid.Parse(scheduleIdStr);
                        }

                        var enrollmentDto = new CreateEnrollmentDto
                        {
                            CourseId = courseId,
                            ScheduleId = scheduleId ?? null
                        };
                        var enrollment = await _enrollmentService.CreateAsync(enrollmentDto, userId);

                        var paymentDto = new CreatePaymentDto
                        {
                            Amount = (decimal)(intent.Amount / 100.0),
                            Currency = intent.Currency,
                            PaymentIntentId = intent.Id,
                            Status = nameof(PaymentStatus.Failed),
                            ReceiptUrl = null
                        };
                        await _paymentService.CreateAsync(paymentDto, userId, enrollment.Id);
                    }
                }
            }
            else if (stripeEvent.Type == Stripe.Events.PaymentIntentCanceled)
            {
                var intent = stripeEvent.Data.Object as Stripe.PaymentIntent;
                if (intent != null)
                {
                    if (intent.Metadata != null && intent.Metadata.TryGetValue("courseId", out var courseIdStr) && intent.Metadata.TryGetValue("userId", out var userIdStr))
                    {
                        var courseId = Guid.Parse(courseIdStr);
                        var userId = Guid.Parse(userIdStr);
                        Guid? scheduleId = null;
                        if (intent.Metadata.TryGetValue("scheduleId", out var scheduleIdStr) && !string.IsNullOrEmpty(scheduleIdStr))
                        {
                            scheduleId = Guid.Parse(scheduleIdStr);
                        }

                        var enrollmentDto = new CreateEnrollmentDto
                        {
                            CourseId = courseId,
                            ScheduleId = scheduleId ?? null
                        };
                        var enrollment = await _enrollmentService.CreateAsync(enrollmentDto, userId);

                        var paymentDto = new CreatePaymentDto
                        {
                            Amount = (decimal)(intent.Amount / 100.0),
                            Currency = intent.Currency,
                            PaymentIntentId = intent.Id,
                            Status = nameof(PaymentStatus.Cancelled),
                            ReceiptUrl = null
                        };
                        await _paymentService.CreateAsync(paymentDto, userId, enrollment.Id);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // Log the error
            Console.WriteLine($"Error processing webhook: {ex.Message}");
            throw;
        }
    }
}