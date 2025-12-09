using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    public enum MatchStatus { Scheduled, Ready, InProgress, Completed }
    public enum Location { Home, Away }

    public enum MatchResult { Win, Loss }

    public class Match
    {
        public Guid Id { get; set; }

        public MatchData data { get; set; }

    }
}
