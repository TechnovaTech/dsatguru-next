using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Services;

public class CourseService : ICourseService
{
    private readonly AppDbContext _context;

    public CourseService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CourseDto> CreateAsync(CreateCourseDto dto, Guid userId)
    {
        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            Overview = dto.Overview,
            CourseDetails = dto.CourseDetails,
            BannerImageUrl = dto.BannerImageUrl,
            Price = dto.Price,
            DiscountedPrice = dto.DiscountedPrice,
            DiscountPercentage = dto.DiscountPercentage,
            StripeProductId = dto.StripeProductId,
            StripePriceId = dto.StripePriceId
        };

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        // Add highlights
        if (dto.Highlights?.Any() == true)
        {
            var highlights = dto.Highlights.Select((h, index) => new CourseHighlight
            {
                CourseId = course.Id,
                Text = h,
                SequenceOrder = index // Set sequence order based on the order in the list
            }).ToList();
            _context.CourseHighlights.AddRange(highlights);
        }

        // Add schedules
        if (dto.Schedules?.Any() == true)
        {
            var schedules = dto.Schedules.Select(s => new CourseSchedule
            {
                CourseId = course.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList();
            _context.CourseSchedules.AddRange(schedules);
        }

        // Add FAQs
        if (dto.FAQs?.Any() == true)
        {
            var faqs = dto.FAQs.Select(f => new CourseFAQ
            {
                CourseId = course.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList();
            _context.CourseFAQs.AddRange(faqs);
        }

        await _context.SaveChangesAsync();
        return await GetByIdAsync(course.Id);
    }

    public async Task<CourseDto> UpdateAsync(Guid id, UpdateCourseDto dto)
    {
        var course = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .FirstOrDefaultAsync(c => c.Id == id);
        if (course == null) throw new NotFoundException("Course not found");

        if (dto.Title != null) course.Title = dto.Title;
        if (dto.Description != null) course.Description = dto.Description;
        if (dto.Overview != null) course.Overview = dto.Overview;
        if (dto.CourseDetails != null) course.CourseDetails = dto.CourseDetails;
        if (dto.BannerImageUrl != null) course.BannerImageUrl = dto.BannerImageUrl;
        if (dto.Price.HasValue) course.Price = dto.Price.Value;
        if (dto.DiscountedPrice.HasValue) course.DiscountedPrice = dto.DiscountedPrice.Value;
        if (dto.DiscountPercentage.HasValue) course.DiscountPercentage = dto.DiscountPercentage.Value;
        if (dto.StripeProductId != null) course.StripeProductId = dto.StripeProductId;
        if (dto.StripePriceId != null) course.StripePriceId = dto.StripePriceId;

        // Update highlights
        if (dto.Highlights != null)
        {
            _context.CourseHighlights.RemoveRange(course.Highlights);
            var highlights = dto.Highlights.Select((h, index) => new CourseHighlight
            {
                CourseId = course.Id,
                Text = h,
                SequenceOrder = index // Set sequence order based on the order in the list
            }).ToList();
            _context.CourseHighlights.AddRange(highlights);
        }

        // Update schedules
        if (dto.Schedules != null)
        {
            _context.CourseSchedules.RemoveRange(course.Schedules);
            var schedules = dto.Schedules.Select(s => new CourseSchedule
            {
                CourseId = course.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList();
            _context.CourseSchedules.AddRange(schedules);
        }

        // Update FAQs
        if (dto.FAQs != null)
        {
            _context.CourseFAQs.RemoveRange(course.FAQs);
            var faqs = dto.FAQs.Select(f => new CourseFAQ
            {
                CourseId = course.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList();
            _context.CourseFAQs.AddRange(faqs);
        }

        course.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(course.Id);
    }

    public async Task DeleteAsync(Guid id)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null) throw new NotFoundException("Course not found");

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync();
    }

    public async Task<List<CourseDto>> GetAllAsync()
    {
        var courses = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .ToListAsync();

        return courses.Select(MapToDto).ToList();
    }

    public async Task<CourseDto> GetByIdAsync(Guid id)
    {
        var course = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null) throw new NotFoundException("Course not found");
        return MapToDto(course);
    }

    public async Task<List<CourseDto>> GetAllWithScheduleAsync()
    {
        var courses = await _context.Courses
            .Include(c => c.Highlights)
            .Include(c => c.Schedules)
            .Include(c => c.FAQs)
            .ToListAsync();

        return courses.Select(course => new CourseDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            Overview = course.Overview,
            CourseDetails = course.CourseDetails,
            BannerImageUrl = course.BannerImageUrl,
            Price = course.Price,
            DiscountedPrice = course.DiscountedPrice,
            DiscountPercentage = course.DiscountPercentage,
            StripeProductId = course.StripeProductId,
            StripePriceId = course.StripePriceId,
            CreatedAt = course.CreatedAt,
            Highlights = course.Highlights?.OrderBy(h => h.SequenceOrder).Select(h => new CourseHighlightDto
            {
                Id = h.Id,
                Text = h.Text,
                SequenceOrder = h.SequenceOrder
            }).ToList() ?? new(),
            Schedules = course.Schedules?.Select(s => new CourseScheduleDto
            {
                Id = s.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList() ?? new(),
            FAQs = course.FAQs?.Select(f => new CourseFAQDto
            {
                Id = f.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList() ?? new()
        }).ToList();
    }

    private static CourseDto MapToDto(Course course)
    {
        return new CourseDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            Overview = course.Overview,
            CourseDetails = course.CourseDetails,
            BannerImageUrl = course.BannerImageUrl,
            Price = course.Price,
            DiscountedPrice = course.DiscountedPrice,
            DiscountPercentage = course.DiscountPercentage,
            StripeProductId = course.StripeProductId,
            StripePriceId = course.StripePriceId,
            CreatedAt = course.CreatedAt,
            Highlights = course.Highlights?.OrderBy(h => h.SequenceOrder).Select(h => new CourseHighlightDto
            {
                Id = h.Id,
                Text = h.Text,
                SequenceOrder = h.SequenceOrder
            }).ToList() ?? new(),
            Schedules = course.Schedules?.Select(s => new CourseScheduleDto
            {
                Id = s.Id,
                Day = s.Day,
                Time = s.Time
            }).ToList() ?? new(),
            FAQs = course.FAQs?.Select(f => new CourseFAQDto
            {
                Id = f.Id,
                Question = f.Question,
                Answer = f.Answer
            }).ToList() ?? new()
        };
    }
}

public class UserService : IUserService
{
    private readonly AppDbContext _context;

    public UserService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto> GetByIdAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) throw new NotFoundException("User not found");

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString()
        };
    }
}

