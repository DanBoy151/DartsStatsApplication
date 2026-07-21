namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// A player's recent Singles form: their last 5 completed Singles games,
    /// and whether their average is trending up or down compared to their
    /// career Singles average. See PlayerFormCalculator for the trend rule.
    /// </summary>
    public class PlayerFormData
    {
        /// <summary>Up to 5 games, most recent first. Fewer than 5 if the player hasn't played that many Singles games yet.</summary>
        public List<PlayerFormGame> recentGames { get; set; } = new();

        /// <summary>Pooled 3-dart average across recentGames. Null if recentGames is empty.</summary>
        public double? recentAverage { get; set; }

        /// <summary>All-time 3-dart average across every completed Singles game. Null if they've never played one.</summary>
        public double? careerAverage { get; set; }

        /// <summary>"Increasing" | "Decreasing" | "Steady" | "Unknown" - see PlayerFormCalculator.DetermineTrend.</summary>
        public string trend { get; set; } = "Unknown";
    }

    public class PlayerFormGame
    {
        public Guid gameId { get; set; }

        public string opponent { get; set; } = "";

        public DateOnly date { get; set; }

        /// <summary>"Win" | "Loss" | "" (the game result wasn't recorded, shouldn't normally happen for a Complete game).</summary>
        public string result { get; set; } = "";

        /// <summary>This player's 3-dart average for just this game. Null if they somehow have no scored visits.</summary>
        public double? average { get; set; }
    }
}
