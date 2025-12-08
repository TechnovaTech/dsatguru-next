using DsatPsatLmsApi.DTOs;

namespace DsatPsatLmsApi.Services;

public interface ICourseService
{
    Task<CourseDto> CreateAsync(CreateCourseDto dto, Guid userId);
    Task<CourseDto> UpdateAsync(Guid id, UpdateCourseDto dto);
    Task DeleteAsync(Guid id);
    Task<List<CourseDto>> GetAllAsync();
    Task<CourseDto> GetByIdAsync(Guid id);
    Task<List<CourseDto>> GetAllWithScheduleAsync();
}

public interface IUserService
{
    Task<UserDto> GetByIdAsync(Guid id);
}

public interface IServiceService
{
    Task<ServiceDto> CreateAsync(CreateServiceDto dto);
    Task<ServiceDto> UpdateAsync(Guid id, UpdateServiceDto dto);
    Task DeleteAsync(Guid id);
    Task<List<ServiceDto>> GetAllAsync();
    Task<ServiceDto> GetByIdAsync(Guid id);
}

public interface IServicePackageService
{
    Task<ServicePackageDto> CreateAsync(CreateServicePackageDto dto, Guid serviceId);
    Task<ServicePackageDto> GetByIdAsync(Guid id);
}

public interface IServiceHighlightService
{
    Task<ServiceHighlightDto> CreateAsync(CreateServiceHighlightDto dto, Guid serviceId);
    Task<ServiceHighlightDto> GetByIdAsync(Guid id);
}

public interface IContactMessageService
{
    Task<ContactMessageDto> CreateAsync(CreateContactMessageDto dto);
    Task<List<ContactMessageDto>> GetAllAsync();
    Task<ContactMessageDto> GetByIdAsync(Guid id);
}

public interface IZoomSessionService
{
    Task<ZoomSessionDto> CreateAsync(CreateZoomSessionDto dto, Guid courseId, Guid? scheduleId);
    Task<ZoomSessionDto> GetByIdAsync(Guid id);
    Task<List<ZoomSessionDto>> GetAllAsync();
}

public interface IEnrollmentService
{
    Task<EnrollmentDto> CreateAsync(CreateEnrollmentDto dto, Guid userId);
    Task<EnrollmentDto> GetByIdAsync(Guid id);
    Task<List<EnrollmentDto>> GetByUserIdAsync(Guid userId);
}

public interface IPaymentService
{
    Task<PaymentDto> CreateAsync(CreatePaymentDto dto, Guid userId, Guid enrollmentId);
    Task<PaymentDto> GetByIdAsync(Guid id);
}

public interface ICheckoutService
{
    Task<object> CreateSessionAsync(CreateSessionDto dto, Guid userId);
    Task<object> ConfirmSessionAsync(string sessionId, Guid userId);
    Task<object> CancelSessionAsync(string sessionId, Guid userId);
}

public interface IWebhookService
{
    Task HandleStripeWebhookAsync(HttpRequest request);
}

public interface ICourseHighlightService
{
    Task<CourseHighlightDto> CreateAsync(CreateCourseHighlightDto dto, Guid courseId);
    Task<CourseHighlightDto> GetByIdAsync(Guid id);
}

public interface ICourseScheduleService
{
    Task<CourseScheduleDto> CreateAsync(CreateCourseScheduleDto dto, Guid courseId);
    Task<CourseScheduleDto> GetByIdAsync(Guid id);
}

public interface ICourseFAQService
{
    Task<CourseFAQDto> CreateAsync(CreateCourseFAQDto dto, Guid courseId);
    Task<CourseFAQDto> GetByIdAsync(Guid id);
}