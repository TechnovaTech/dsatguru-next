using System;

namespace DsatPsatLmsApi.Models
{
    public class FinalScore
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; }
        public int MathScore { get; set; }
        public int ReadingWritingScore { get; set; }
        public int TotalScore { get; set; }
        public DateTime CalculationDate { get; set; }
    }
}