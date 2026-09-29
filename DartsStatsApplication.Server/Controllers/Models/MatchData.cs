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

        /// <summary>Which Season (and therefore League/Team) this match belongs to, if any. Null = plays by today's hardcoded defaults.</summary>
        public Guid? seasonId { get; set; }

        /// <summary>Set when the match is started (MatchService.StartMatch).</summary>
        public DateTime? startTime { get; set; }

        /// <summary>Set when the match is completed (MatchService.CompleteMatch).</summary>
        public DateTime? finishTime { get; set; }

        /// <summary>
        /// Null until recorded (see MatchService.RecordOppositionHeadcount) -
        /// true if the opposition arrived with only 5 available players
        /// rather than a full 6. Combined with our own availablePlayers
        /// count, this decides whether the match's last Singles game is
        /// played normally, awarded as a walkover, or not played at all.
        /// Overwritten by every re-Proceed (e.g. after "Back to Players"),
        /// which also undoes any earlier forfeit/void before applying the
        /// new outcome - see MatchService.ReconcileOppositionHeadcount. Sent
        /// back to the client so the roster screen's checkbox starts from it.
        /// </summary>
        public bool? oppositionShortHanded { get; set; }

        /// <summary>
        /// True while a headcount forfeit/void is currently applied to one
        /// of this match's Singles games (i.e. the outcome wasn't None). A
        /// forfeited game records which way a walkover went by itself, but a
        /// voided one is deleted outright - this is the only trace of it, so
        /// a later re-Proceed knows to recreate it when undoing (see
        /// MatchService.CurrentHeadcountOutcome).
        /// </summary>
        public bool oppositionHeadcountResolved { get; set; }

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

    public class OppositionHeadcountData
    {
        public bool oppositionShortHanded { get; set; }
    }
}
