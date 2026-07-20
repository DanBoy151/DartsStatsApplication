namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// A player's aggregated career stats, computed across every leg they've
    /// played in (not just one match). See PlayerStatsCalculator for the maths.
    /// </summary>
    public class PlayerStatsData
    {
        public Guid playerId { get; set; }

        public string name { get; set; } = "";

        public int legsPlayed { get; set; }

        public int legsWon { get; set; }

        public int legsLost { get; set; }

        /// <summary>Null until at least one leg has a result (win or loss).</summary>
        public double? winPercentage { get; set; }

        /// <summary>3-dart average: points scored per dart thrown, scaled to 3 darts.</summary>
        public double? threeDartAverage { get; set; }

        /// <summary>Average of just each leg's first 3 visits (9 darts).</summary>
        public double? firstNineAverage { get; set; }

        /// <summary>Visits scoring 100-139.</summary>
        public int tons { get; set; }

        /// <summary>Visits scoring 140-179.</summary>
        public int ton40s { get; set; }

        /// <summary>Visits scoring exactly 180.</summary>
        public int maximums { get; set; }

        /// <summary>The highest score that was also a checkout. Null until they've won a leg.</summary>
        public int? highestCheckout { get; set; }

        /// <summary>
        /// Fewest darts to win a leg. For Doubles/Trebles this is the whole
        /// leg's dart count (a shared leg is won together), credited to
        /// every player on the winning side, not just whoever threw the
        /// checkout. Null until they've won a leg.
        /// </summary>
        public int? bestLegDarts { get; set; }
    }
}
