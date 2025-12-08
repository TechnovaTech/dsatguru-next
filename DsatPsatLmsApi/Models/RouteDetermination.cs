using System;

namespace DsatPsatLmsApi.Models
{
    public class RouteDetermination
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; }
        public string DifficultyModule { get; set; } // "Low", "Medium", or "High"
        public DateTime DeterminationDate { get; set; }
    }
}