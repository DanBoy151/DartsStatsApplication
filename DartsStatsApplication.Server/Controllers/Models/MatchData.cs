using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{
    public class MatchData
    {
        public MatchStatus status { get; set; }
        public string opponent { get; set; }
        public DateOnly date { get; set; }
        public Location location { get; set; }
        public Guid? playerOfMatch { get; set; }
        public MatchResult? result { get; set; }
        public List<Guid>? availablePlayers { get; set; }
        public int gamesFor { get; set; }
        public int gamesAgainst { get; set; }

    }

    public class CompleteMatchData
    {
        public Guid Id { get; set; }
        public Guid playerOfMatch { get; set; }
        public MatchResult result { get; set; }
    }

    public class StartMatchData
    {
        public List<Guid> availablePlayers { get; set; }
    }
}
