using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{
    public class GameData
    {
        public Guid matchId { get; set; }

        public GameType type { get; set; }

        public GameStatus status { get; set; }

        public List<Guid> playerIds { get; set; }

        public Boolean wonBull { get; set; }

        public GameResult? result { get; set; }

        /// <summary>
        /// True for a game awarded as a walkover because one side only had 5
        /// available players (see MatchService.RecordOppositionHeadcount) -
        /// it still reaches Complete with a normal Win/Loss result and counts
        /// toward the match score, just with zero Legs ever played.
        /// </summary>
        public Boolean forfeited { get; set; }

        public int order { get; set; }

        /// <summary>
        /// How many legs this game is played to, and the leg starting score -
        /// resolved once from the match's League (or today's hardcoded 3/501,
        /// 1/601, 1/701 defaults when there's no league) at game-creation time
        /// in MatchService.CreatePendingGames, and stamped here so it's an
        /// immutable snapshot of what was actually configured when this game
        /// was played - a later League edit must never retroactively change it.
        /// </summary>
        public int legsToPlay { get; set; }

        public int startingScore { get; set; }

        /// <summary>Copied from League.maxRounds at creation time. Null = no round limit.</summary>
        public int? maxRounds { get; set; }

        /// <summary>Copied from League.lateCutoverTime at creation time. Null = no late-night options.</summary>
        public string? lateCutoverTime { get; set; }

        /// <summary>
        /// The late-night choice made for this game (see lateCutoverTime), or
        /// null if it was started before the cutover and so never asked.
        /// ThrowForBull means the game's result was decided by the bull alone
        /// rather than by its legs (any legs already played still count
        /// toward stats, but not toward the result).
        /// </summary>
        public GamePlayMode? playMode { get; set; }
    }

    public class CompleteGameData
    {
        public GameResult result { get; set; }

        /// <summary>
        /// True to complete an In Progress game on a throw for bull rather than
        /// on its legs - only allowed when the game's league has a late cutover
        /// configured. The result is then the bull's result, not the leg majority.
        /// </summary>
        public bool throwForBull { get; set; }
    }

    public class UpdatePlayersData
    {
        public List<Guid> selectedPlayers { get; set; }
    }

}
