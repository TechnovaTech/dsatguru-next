using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Data;
using DsatPsatLmsApi.DTOs;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Services;

public class CourseHighlightService : ICourseHighlightService
{
    private readonly AppDbContext _context;
    public CourseHighlightService(AppDbContext context) => _context = context;

    public async Task<CourseHighlightDto> CreateAsync(CreateCourseHighlightDto dto, Guid courseId)
    {
        // Get the highest sequence order for this course
        var maxOrder = await _context.CourseHighlights
            .Where(h => h.CourseId == courseId)
            .Select(h => (int?)h.SequenceOrder)
            .MaxAsync() ?? -1;
            
        var highlight = new CourseHighlight
        {
            CourseId = courseId,
            Text = dto.Text,
            SequenceOrder = maxOrder + 1 // Set the next sequence order
        };
        _context.CourseHighlights.Add(highlight);
        await _context.SaveChangesAsync();
        return new CourseHighlightDto { Id = highlight.Id, Text = highlight.Text, SequenceOrder = highlight.SequenceOrder };
    }

    public async Task<CourseHighlightDto> GetByIdAsync(Guid id)
    {
        var highlight = await _context.CourseHighlights.FindAsync(id) ?? throw new NotFoundException("Course highlight not found");
        return new CourseHighlightDto { Id = highlight.Id, Text = highlight.Text, SequenceOrder = highlight.SequenceOrder };
    }
}

public class CourseScheduleService : ICourseScheduleService
{
    private readonly AppDbContext _context;
    public CourseScheduleService(AppDbContext context) => _context = context;

    public async Task<CourseScheduleDto> CreateAsync(CreateCourseScheduleDto dto, Guid courseId)
    {
        var schedule = new CourseSchedule
        {
            CourseId = courseId,
            Day = dto.Day,
            Time = dto.Time
        };
        _context.CourseSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return new CourseScheduleDto { Id = schedule.Id, Day = schedule.Day, Time = schedule.Time };
    }

    public async Task<CourseScheduleDto> GetByIdAsync(Guid id)
    {
        var schedule = await _context.CourseSchedules.FindAsync(id) ?? throw new NotFoundException("Course schedule not found");
        return new CourseScheduleDto { Id = schedule.Id, Day = schedule.Day, Time = schedule.Time };
    }
}

public class CourseFAQService : ICourseFAQService
{
    private readonly AppDbContext _context;
    public CourseFAQService(AppDbContext context) => _context = context;

    public async Task<CourseFAQDto> CreateAsync(CreateCourseFAQDto dto, Guid courseId)
    {
        var faq = new CourseFAQ
        {
            CourseId = courseId,
            Question = dto.Question,
            Answer = dto.Answer
        };
        _context.CourseFAQs.Add(faq);
        await _context.SaveChangesAsync();
        return new CourseFAQDto { Id = faq.Id, Question = faq.Question, Answer = faq.Answer };
    }

    public async Task<CourseFAQDto> GetByIdAsync(Guid id)
    {
        var faq = await _context.CourseFAQs.FindAsync(id) ?? throw new NotFoundException("Course FAQ not found");
        return new CourseFAQDto { Id = faq.Id, Question = faq.Question, Answer = faq.Answer };
    }
}