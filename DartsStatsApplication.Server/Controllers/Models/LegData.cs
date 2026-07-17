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
    }

    public class CompleteLegData
    {
        public List<PlayerScore> score { get; set; }

        public LegResult? result { get; set; }

        public int? finishDarts { get; set; }

        public int remainingScore { get; set; }
    }

}
