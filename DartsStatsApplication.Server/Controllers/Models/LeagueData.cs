namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// A league's configurable ruleset - how many games of each type a match
    /// has, how many legs each is played to, their starting scores, and an
    /// optional round limit before a leg gets decided by a bull-off instead
    /// of normal scoring. Every match played under a season linked to this
    /// league uses these rules (see MatchService.ResolveLeague).
    /// </summary>
    public class LeagueData
    {
        public string name { get; set; } = "";

        public int numTrebles { get; set; }
        public int numDoubles { get; set; }
        public int numSingles { get; set; }

        public int treblesLegs { get; set; }
        public int doublesLegs { get; set; }
        public int singlesLegs { get; set; }

        public int treblesStartScore { get; set; }
        public int doublesStartScore { get; set; }
        public int singlesStartScore { get; set; }

        /// <summary>Null = no round limit, legs are always played to a normal finish.</summary>
        public int? maxRounds { get; set; }
    }
}
