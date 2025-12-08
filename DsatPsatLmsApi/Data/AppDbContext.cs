using Microsoft.EntityFrameworkCore;
using DsatPsatLmsApi.Models;

namespace DsatPsatLmsApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Course> Courses { get; set; }
    public DbSet<CourseHighlight> CourseHighlights { get; set; }
    public DbSet<CourseSchedule> CourseSchedules { get; set; }
    public DbSet<CourseFAQ> CourseFAQs { get; set; }
    public DbSet<CourseEnrollment> CourseEnrollments { get; set; }
    public DbSet<QuestionBankEnrollment> QuestionBankEnrollments { get; set; }
    public DbSet<Service> Services { get; set; }
    public DbSet<ServicePackage> ServicePackages { get; set; }
    public DbSet<ServiceHighlight> ServiceHighlights { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<ContactMessage> ContactMessages { get; set; }
    public DbSet<ZoomSession> ZoomSessions { get; set; }
    public DbSet<AccessToken> AccessTokens { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<StaticPage> StaticPages { get; set; }
    public DbSet<LiveClass> LiveClasses { get; set; }
    public DbSet<LiveClassAttendance> LiveClassAttendances { get; set; }
    public DbSet<Question> Questions { get; set; }
    public DbSet<Announcement> Announcements { get; set; }
    public DbSet<CalendarEvent> CalendarEvents { get; set; }
    public DbSet<StudentProgress> StudentProgresses { get; set; }
    public DbSet<TutorPerformance> TutorPerformances { get; set; }
    public DbSet<EnhancedQuestion> EnhancedQuestions { get; set; }
    public DbSet<QuestionAttempt> QuestionAttempts { get; set; }
    public DbSet<QuestionRating> QuestionRatings { get; set; }
    public DbSet<QuestionBank> QuestionBanks { get; set; }
    public DbSet<ClassType> ClassTypes { get; set; }
    public DbSet<EnhancedLiveClass> EnhancedLiveClasses { get; set; }
    public DbSet<ClassEnrollment> ClassEnrollments { get; set; }
    public DbSet<ClassAttendance> ClassAttendances { get; set; }
    public DbSet<ClassFeedback> ClassFeedbacks { get; set; }
    public DbSet<ClassMessage> ClassMessages { get; set; }
    public DbSet<TestSession> TestSessions { get; set; }
    public DbSet<SessionQuestion> SessionQuestions { get; set; }
    public DbSet<TestResult> TestResults { get; set; }
    public DbSet<RouteDetermination> RouteDeterminations { get; set; }
    public DbSet<FinalScore> FinalScores { get; set; }
    public DbSet<IrtCalculation> IrtCalculations { get; set; }
    public DbSet<LiveMeeting> LiveMeetings { get; set; }
    public DbSet<StudyMaterial> StudyMaterials { get; set; }
    public DbSet<SyllabusTopic> SyllabusTopics { get; set; }
    public DbSet<Assignment> Assignments { get; set; }
    public DbSet<StudyPlanModule> StudyPlanModules { get; set; }
    public DbSet<StudyPlanModuleProgress> StudyPlanModuleProgresses { get; set; }
    public DbSet<PerformanceRouting> PerformanceRoutings { get; set; }
    public DbSet<UserResponse> UserResponses { get; set; }
    public DbSet<AdaptiveConfig> AdaptiveConfigs { get; set; }
    public DbSet<TestAttempt> TestAttempts { get; set; }
    
    // Practice System DbSets
    public DbSet<PracticeSession> PracticeSessions { get; set; }
    public DbSet<PracticeAnswer> PracticeAnswers { get; set; }
    public DbSet<UserQuestionStats> UserQuestionStats { get; set; }
    public DbSet<UserPracticePreferences> UserPracticePreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Service>().HasIndex(s => s.Slug).IsUnique();
        modelBuilder.Entity<StaticPage>().HasIndex(p => p.Slug).IsUnique();
        
        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.User).WithMany(u => u.Enrollments).HasForeignKey(e => e.UserId);
        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(e => e.Course).WithMany(c => c.Enrollments).HasForeignKey(e => e.CourseId);
        
        modelBuilder.Entity<QuestionBankEnrollment>()
            .HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<QuestionBankEnrollment>()
            .HasOne(e => e.QuestionBank).WithMany().HasForeignKey(e => e.QuestionBankId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<CourseHighlight>()
            .HasOne(h => h.Course).WithMany(c => c.Highlights).HasForeignKey(h => h.CourseId);
        modelBuilder.Entity<CourseSchedule>()
            .HasOne(s => s.Course).WithMany(c => c.Schedules).HasForeignKey(s => s.CourseId);
        modelBuilder.Entity<CourseFAQ>()
            .HasOne(f => f.Course).WithMany(c => c.FAQs).HasForeignKey(f => f.CourseId);
        
        modelBuilder.Entity<ServicePackage>()
            .HasOne(p => p.Service).WithMany(s => s.Packages).HasForeignKey(p => p.ServiceId);
        modelBuilder.Entity<ServiceHighlight>()
            .HasOne(h => h.Service).WithMany(s => s.Highlights).HasForeignKey(h => h.ServiceId);
        
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Enrollment).WithMany(e => e.Payments).HasForeignKey(p => p.EnrollmentId);
        
        modelBuilder.Entity<ZoomSession>()
            .HasOne(z => z.Course).WithMany(c => c.ZoomSessions).HasForeignKey(z => z.CourseId);
        modelBuilder.Entity<ZoomSession>()
            .HasOne(z => z.Schedule).WithMany(s => s.ZoomSessions).HasForeignKey(z => z.ScheduleId);
        
        modelBuilder.Entity<AccessToken>()
            .HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId);
        modelBuilder.Entity<PasswordResetToken>()
            .HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId);
        
        modelBuilder.Entity<LiveClass>()
            .HasOne(c => c.Instructor).WithMany().HasForeignKey(c => c.InstructorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<LiveClassAttendance>()
            .HasOne(a => a.LiveClass).WithMany(c => c.Attendances).HasForeignKey(a => a.LiveClassId);
        modelBuilder.Entity<LiveClassAttendance>()
            .HasOne(a => a.Student).WithMany().HasForeignKey(a => a.StudentId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<Question>()
            .HasOne(q => q.Creator).WithMany().HasForeignKey(q => q.CreatedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Question>()
            .HasOne(q => q.QuestionBank).WithMany().HasForeignKey(q => q.QuestionBankId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Question>()
            .Property(q => q.Options).HasColumnType("nvarchar(max)");
        modelBuilder.Entity<Question>()
            .Property(q => q.Tags).HasColumnType("nvarchar(max)");
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.Creator).WithMany().HasForeignKey(a => a.CreatedBy).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<CalendarEvent>()
            .HasOne(e => e.Creator).WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<StudentProgress>()
            .HasOne(p => p.Student).WithMany().HasForeignKey(p => p.StudentId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<StudentProgress>()
            .HasOne(p => p.Course).WithMany().HasForeignKey(p => p.CourseId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TutorPerformance>()
            .HasOne(p => p.Tutor).WithMany().HasForeignKey(p => p.TutorId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<EnhancedQuestion>()
            .HasOne(q => q.Creator).WithMany().HasForeignKey(q => q.CreatedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EnhancedQuestion>()
            .HasOne(q => q.QuestionBank).WithMany(qb => qb.Questions).HasForeignKey(q => q.QuestionBankId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<QuestionAttempt>()
            .HasOne(a => a.Question).WithMany(q => q.Attempts).HasForeignKey(a => a.QuestionId);
        modelBuilder.Entity<QuestionAttempt>()
            .HasOne(a => a.Student).WithMany().HasForeignKey(a => a.StudentId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<QuestionRating>()
            .HasOne(r => r.Question).WithMany(q => q.Ratings).HasForeignKey(r => r.QuestionId);
        modelBuilder.Entity<QuestionRating>()
            .HasOne(r => r.Student).WithMany().HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<QuestionBank>()
            .HasOne(qb => qb.Creator).WithMany().HasForeignKey(qb => qb.CreatedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<QuestionBank>()
            .Property(qb => qb.Tags).HasColumnType("nvarchar(max)");
        
        modelBuilder.Entity<EnhancedLiveClass>()
            .HasOne(c => c.Instructor).WithMany().HasForeignKey(c => c.InstructorId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<EnhancedLiveClass>()
            .HasOne(c => c.ClassType).WithMany(ct => ct.Classes).HasForeignKey(c => c.ClassTypeId);
        modelBuilder.Entity<EnhancedLiveClass>()
            .HasOne(c => c.ParentClass).WithMany(c => c.RecurringClasses).HasForeignKey(c => c.ParentClassId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<ClassEnrollment>()
            .HasOne(e => e.Class).WithMany(c => c.Enrollments).HasForeignKey(e => e.ClassId);
        modelBuilder.Entity<ClassEnrollment>()
            .HasOne(e => e.Student).WithMany().HasForeignKey(e => e.StudentId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<ClassAttendance>()
            .HasOne(a => a.Class).WithMany(c => c.Attendances).HasForeignKey(a => a.ClassId);
        modelBuilder.Entity<ClassAttendance>()
            .HasOne(a => a.Student).WithMany().HasForeignKey(a => a.StudentId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<ClassFeedback>()
            .HasOne(f => f.Class).WithMany(c => c.Feedbacks).HasForeignKey(f => f.ClassId);
        modelBuilder.Entity<ClassFeedback>()
            .HasOne(f => f.Student).WithMany().HasForeignKey(f => f.StudentId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<ClassMessage>()
            .HasOne(m => m.Class).WithMany(c => c.Messages).HasForeignKey(m => m.ClassId);
        modelBuilder.Entity<ClassMessage>()
            .HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.NoAction);
            
        // Test Session related configurations
        modelBuilder.Entity<TestSession>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<SessionQuestion>()
            .HasOne(q => q.TestSession).WithMany(s => s.Questions).HasForeignKey(q => q.TestSessionId);
            
        // Test Result related configurations
        modelBuilder.Entity<TestResult>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<RouteDetermination>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<FinalScore>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<IrtCalculation>()
            .HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.NoAction);
            
        // Course content related configurations
        modelBuilder.Entity<LiveMeeting>()
            .HasOne(m => m.Course).WithMany(c => c.LiveMeetings).HasForeignKey(m => m.CourseId);
        modelBuilder.Entity<StudyMaterial>()
            .HasOne(m => m.Course).WithMany(c => c.StudyMaterials).HasForeignKey(m => m.CourseId);
        modelBuilder.Entity<SyllabusTopic>()
            .HasOne(s => s.Course).WithMany(c => c.SyllabusTopics).HasForeignKey(s => s.CourseId);
        modelBuilder.Entity<Assignment>()
            .HasOne(a => a.Course).WithMany(c => c.Assignments).HasForeignKey(a => a.CourseId);
            
        // Study Plan related configurations
        modelBuilder.Entity<StudyPlanModuleProgress>()
            .HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StudyPlanModuleProgress>()
            .HasOne(p => p.Module).WithMany(m => m.UserProgress).HasForeignKey(p => p.ModuleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PerformanceRouting>()
            .HasOne(r => r.FromModule).WithMany().HasForeignKey(r => r.FromModuleId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PerformanceRouting>()
            .HasOne(r => r.ToModule).WithMany(m => m.RoutingRules).HasForeignKey(r => r.ToModuleId).OnDelete(DeleteBehavior.NoAction);
            
        // UserResponse related configurations
        modelBuilder.Entity<UserResponse>()
            .HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserResponse>()
            .HasOne(r => r.Question).WithMany().HasForeignKey(r => r.QuestionId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserResponse>()
            .HasOne(r => r.Reviewer).WithMany().HasForeignKey(r => r.ReviewedBy).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserResponse>()
            .HasOne(r => r.TestSession).WithMany().HasForeignKey(r => r.TestSessionId).OnDelete(DeleteBehavior.NoAction);
            
        // AdaptiveConfig related configurations
        modelBuilder.Entity<AdaptiveConfig>()
            .HasOne(c => c.Creator).WithMany().HasForeignKey(c => c.CreatedBy).OnDelete(DeleteBehavior.NoAction);
            
        // TestAttempt related configurations
        modelBuilder.Entity<TestAttempt>()
            .HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TestAttempt>()
            .HasOne(a => a.AdaptiveConfig).WithMany().HasForeignKey(a => a.AdaptiveConfigId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TestAttempt>()
            .HasOne(a => a.BaseTestSession).WithMany().HasForeignKey(a => a.BaseTestSessionId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TestAttempt>()
            .HasOne(a => a.Adaptive1Session).WithMany().HasForeignKey(a => a.Adaptive1SessionId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TestAttempt>()
            .HasOne(a => a.Adaptive2Session).WithMany().HasForeignKey(a => a.Adaptive2SessionId).OnDelete(DeleteBehavior.NoAction);
            
        // Practice System related configurations
        modelBuilder.Entity<PracticeSession>()
            .HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<PracticeSession>()
            .HasMany(p => p.Answers).WithOne(a => a.PracticeSession).HasForeignKey(a => a.PracticeSessionId).OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<PracticeAnswer>()
            .HasOne(a => a.PracticeSession).WithMany(p => p.Answers).HasForeignKey(a => a.PracticeSessionId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PracticeAnswer>()
            .HasOne(a => a.Question).WithMany().HasForeignKey(a => a.QuestionId).OnDelete(DeleteBehavior.NoAction);
            
        modelBuilder.Entity<UserQuestionStats>()
            .HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserQuestionStats>()
            .HasOne(s => s.Question).WithMany().HasForeignKey(s => s.QuestionId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<UserQuestionStats>()
            .HasIndex(s => new { s.UserId, s.QuestionId }).IsUnique(); // Ensure one stats record per user-question pair
            
        modelBuilder.Entity<UserPracticePreferences>()
            .HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserPracticePreferences>()
            .HasIndex(p => p.UserId).IsUnique(); // One preference record per user
    }
}