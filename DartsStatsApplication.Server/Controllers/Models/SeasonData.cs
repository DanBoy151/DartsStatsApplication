using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// A season is one Team's campaign in one League for a period - a series of
    /// Matches (see MatchData.seasonId) played under the League's rules.
    /// </summary>
    public class SeasonData
    {
        public string name { get; set; } = "";

        public Guid leagueId { get; set; }

        public Guid teamId { get; set; }
    }

    /// <summary>
    /// Response shape for a Season, with its computed (never stored) status attached.
    /// </summary>
    public class SeasonResponse
    {
        public Guid id { get; set; }

        public SeasonData data { get; set; }

        public SeasonStatus status { get; set; }
    }
}
