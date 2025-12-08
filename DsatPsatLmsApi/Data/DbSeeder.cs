using DsatPsatLmsApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DsatPsatLmsApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@dsatguru.com");
        if (adminUser == null)
        {
            adminUser = new User
            {
                Name = "Admin User",
                Email = "admin@dsatguru.com",
                Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Role = UserRole.Admin,
                IsActive = true
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }

        var targetCourseId = Guid.Parse("9d1dc768-c871-43ac-8142-0e81fb9b8592");
        var course = await context.Courses.FirstOrDefaultAsync(c => c.Id == targetCourseId);
        if (course == null)
        {
            course = new Course
            {
                Id = targetCourseId,
                Title = "DSAT Math Prep Course",
                Description = "Comprehensive DSAT Math preparation course with expert guidance",
                Price = 299.99m,
                StripeProductId = null,
                StripePriceId = null
            };
            context.Courses.Add(course);
            await context.SaveChangesAsync();
        }
        else
        {
            if (course.Price <= 0)
            {
                course.Price = 299.99m;
            }
            // Clear any sample Stripe IDs which are invalid in real Stripe
            if (!string.IsNullOrEmpty(course.StripePriceId) && course.StripePriceId.Contains("price_sample"))
            {
                course.StripePriceId = null;
            }
            if (!string.IsNullOrEmpty(course.StripeProductId) && course.StripeProductId.Contains("prod_sample"))
            {
                course.StripeProductId = null;
            }
            await context.SaveChangesAsync();
        }

        // Add course highlights
        var highlights = new List<CourseHighlight>
        {
            new() { CourseId = course.Id, Text = "Expert instructors with proven track record" },
            new() { CourseId = course.Id, Text = "Comprehensive study materials included" },
            new() { CourseId = course.Id, Text = "Practice tests and mock exams" }
        };

        if (!await context.CourseHighlights.AnyAsync(h => h.CourseId == course.Id))
        {
            context.CourseHighlights.AddRange(highlights);
        }

        // Add course schedules
        var schedules = new List<CourseSchedule>
        {
            new() { CourseId = course.Id, Day = "Monday", Time = "6:00 PM - 8:00 PM" },
            new() { CourseId = course.Id, Day = "Wednesday", Time = "6:00 PM - 8:00 PM" },
            new() { CourseId = course.Id, Day = "Friday", Time = "6:00 PM - 8:00 PM" }
        };

        if (!await context.CourseSchedules.AnyAsync(s => s.CourseId == course.Id))
        {
            context.CourseSchedules.AddRange(schedules);
        }

        // Add course FAQs
        var faqs = new List<CourseFAQ>
        {
            new() { CourseId = course.Id, Question = "How long is the course?", Answer = "The course runs for 8 weeks with 3 sessions per week." },
            new() { CourseId = course.Id, Question = "Are materials included?", Answer = "Yes, all study materials and practice tests are included." }
        };

        if (!await context.CourseFAQs.AnyAsync(f => f.CourseId == course.Id))
        {
            context.CourseFAQs.AddRange(faqs);
        }

        await context.SaveChangesAsync();
        
        // Seed question bank data
        await SeedQuestionBankData(context);
    }
    
    private static async Task SeedQuestionBankData(AppDbContext context)
    {
        // Check if we already have question bank courses
        var existingQuestionBanks = await context.Courses
            .Where(c => c.Type == "question_bank")
            .CountAsync();
            
        if (existingQuestionBanks > 0)
        {
            var banksWithoutPrice = await context.Courses
                .Where(c => c.Type == "question_bank" && c.Price <= 0)
                .ToListAsync();
            foreach (var qb in banksWithoutPrice)
            {
                qb.Price = 49.99m;
            }
            if (banksWithoutPrice.Count > 0)
            {
                await context.SaveChangesAsync();
            }
            return;
        }

        // Get the admin user
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@dsatguru.com");
        if (adminUser == null) return;

        // Create test question bank courses
        var mathQuestionBank = new Course
        {
            Id = Guid.NewGuid(),
            Title = "SAT Math Question Bank",
            Description = "Collection of SAT Math questions",
            Type = "question_bank",
            Price = 49.99m
        };

        var englishQuestionBank = new Course
        {
            Id = Guid.NewGuid(),
            Title = "SAT English Question Bank",
            Description = "Collection of SAT English questions",
            Type = "question_bank",
            Price = 49.99m
        };

        context.Courses.AddRange(mathQuestionBank, englishQuestionBank);
        await context.SaveChangesAsync();

        // Create test questions for math question bank
        var mathQuestions = new List<Question>
        {
            new Question
            {
                Id = Guid.NewGuid(),
                Title = "Algebra Problem 1",
                Content = "If 2x + 5 = 13, what is the value of x?",
                Options = "A) 2,B) 3,C) 4,D) 5",
                CorrectAnswer = "C",
                Explanation = "2x + 5 = 13, so 2x = 8, therefore x = 4",
                Subject = "Math",
                Difficulty = DifficultyLevel.Medium,
                Type = QuestionType.MultipleChoice,
                TestType = TestType.Base,
                Points = 1,
                IsActive = true,
                CreatedBy = adminUser.Id,
                QuestionBankId = mathQuestionBank.Id
            },
            new Question
            {
                Id = Guid.NewGuid(),
                Title = "Geometry Problem 1",
                Content = "What is the area of a circle with radius 5?",
                Options = "A) 25π,B) 10π,C) 5π,D) 15π",
                CorrectAnswer = "A",
                Explanation = "Area = πr² = π(5)² = 25π",
                Subject = "Math",
                Difficulty = DifficultyLevel.Easy,
                Type = QuestionType.MultipleChoice,
                TestType = TestType.Base,
                Points = 1,
                IsActive = true,
                CreatedBy = adminUser.Id,
                QuestionBankId = mathQuestionBank.Id
            }
        };

        // Create test questions for english question bank
        var englishQuestions = new List<Question>
        {
            new Question
            {
                Id = Guid.NewGuid(),
                Title = "Reading Comprehension 1",
                Content = "Which word best describes the author's tone in the passage?",
                Options = "A) Optimistic,B) Pessimistic,C) Neutral,D) Sarcastic",
                CorrectAnswer = "A",
                Explanation = "The author uses positive language throughout the passage.",
                Subject = "English",
                Difficulty = DifficultyLevel.Medium,
                Type = QuestionType.MultipleChoice,
                TestType = TestType.Base,
                Points = 1,
                IsActive = true,
                CreatedBy = adminUser.Id,
                QuestionBankId = englishQuestionBank.Id
            },
            new Question
            {
                Id = Guid.NewGuid(),
                Title = "Grammar Question 1",
                Content = "Choose the correct sentence:",
                Options = "A) Their going to the store,B) They're going to the store,C) There going to the store,D) Theyre going to the store",
                CorrectAnswer = "B",
                Explanation = "'They're' is the contraction for 'they are'.",
                Subject = "English",
                Difficulty = DifficultyLevel.Easy,
                Type = QuestionType.MultipleChoice,
                TestType = TestType.Base,
                Points = 1,
                IsActive = true,
                CreatedBy = adminUser.Id,
                QuestionBankId = englishQuestionBank.Id
            }
        };

        context.Questions.AddRange(mathQuestions);
        context.Questions.AddRange(englishQuestions);
        await context.SaveChangesAsync();
        
        // Seed sample question bank enrollments
        await SeedQuestionBankEnrollments(context, adminUser, mathQuestionBank, englishQuestionBank);
    }
    
    private static async Task SeedQuestionBankEnrollments(AppDbContext context, User adminUser, Course mathQuestionBank, Course englishQuestionBank)
    {
        // Check if we already have question bank enrollments
        var existingEnrollments = await context.QuestionBankEnrollments.AnyAsync();
        if (existingEnrollments)
        {
            return;
        }
        
        // Create a sample student user if not exists
        var studentUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "student@example.com");
        if (studentUser == null)
        {
            studentUser = new User
            {
                Name = "Sample Student",
                Email = "student@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("student123"),
                Role = UserRole.Student,
                IsActive = true
            };
            context.Users.Add(studentUser);
            await context.SaveChangesAsync();
        }
        
        // Create sample enrollments
        var enrollments = new List<QuestionBankEnrollment>
        {
            new QuestionBankEnrollment
            {
                UserId = studentUser.Id,
                QuestionBankId = mathQuestionBank.Id,
                EnrolledAt = DateTime.UtcNow.AddDays(-7)
            },
            new QuestionBankEnrollment
            {
                UserId = studentUser.Id,
                QuestionBankId = englishQuestionBank.Id,
                EnrolledAt = DateTime.UtcNow.AddDays(-3)
            }
        };
        
        context.QuestionBankEnrollments.AddRange(enrollments);
        await context.SaveChangesAsync();
    }
}