using System;

namespace DsatPsatLmsApi.Models
{
    public class TestResult
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; }
        public string ModuleType { get; set; } // "Base" or "Adaptive"
        public int MathScore { get; set; }
        public int ReadingWritingScore { get; set; }
        public int TotalScore { get; set; }
        public DateTime CompletionDate { get; set; }
        public int QuestionsAttempted { get; set; }
        public int CorrectAnswers { get; set; }
    }
}