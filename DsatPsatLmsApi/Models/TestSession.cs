using System;
using System.Collections.Generic;

namespace DsatPsatLmsApi.Models
{
    public class TestSession
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string ModuleRoute { get; set; } = "Medium"; // Low, Medium, High
        public int TotalQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public int Score { get; set; }
        public List<SessionQuestion> Questions { get; set; } = new List<SessionQuestion>();
    }
}