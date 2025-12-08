using System;

namespace DsatPsatLmsApi.Models
{
    public class IrtCalculation
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; }
        public double MathAbility { get; set; }
        public double ReadingWritingAbility { get; set; }
        public double MathStandardError { get; set; }
        public double ReadingWritingStandardError { get; set; }
        public DateTime CalculationDate { get; set; }
    }
}