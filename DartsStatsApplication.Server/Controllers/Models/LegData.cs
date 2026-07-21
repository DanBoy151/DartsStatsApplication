using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{
    public class PlayerScore
    {
        public Guid playerId { get; set; }
        public int score { get; set; }
    }

        public class LegData
    {
        public Guid gameID { get; set; }

        public LegStatus status { get; set; }

        public List<PlayerScore> score { get; set; }

        public LegResult? result { get; set; }

        public int? finishDarts { get; set; }

        public int order { get; set; }

        public int remainingScore { get; set; }

        /// <summary>
        /// True when this leg was decided by a bull-off (the game's configured
        /// max rounds was reached with no winner) rather than a normal checkout -
        /// PlayerStatsCalculator excludes a bull-off win from checkout/best-leg
        /// stats, since no checkout darts were actually thrown.
        /// </summary>
        public bool wonByBullOff { get; set; }
    }

    public class CompleteLegData
    {
        public List<PlayerScore> score { get; set; }

        public LegResult? result { get; set; }

        public int? finishDarts { get; set; }

        public int remainingScore { get; set; }
    }

    /// <summary>
    /// Completes a leg via bull-off once it's passed the game's max rounds. The
    /// real throws already made before the threshold are still submitted (and
    /// persisted) here - only the checkout itself is skipped, so those throws
    /// still count toward average/tons/140s/180s.
    /// </summary>
    public class CompleteLegBullOffData
    {
        public List<PlayerScore> score { get; set; }

        public LegResult result { get; set; }

        public int remainingScore { get; set; }
    }

}
