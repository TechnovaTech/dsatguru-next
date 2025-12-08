using System;

namespace DsatPsatLmsApi.Models
{
    public class SessionQuestion
    {
        public Guid Id { get; set; }
        public Guid TestSessionId { get; set; }
        public TestSession TestSession { get; set; }
        public string Content { get; set; }
        public string Subject { get; set; }
        public DifficultyLevel Difficulty { get; set; }
        public string CorrectAnswer { get; set; }
        public string UserAnswer { get; set; }
        public int TimeSpent { get; set; } // in seconds
    }
}