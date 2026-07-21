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
    }

    public class CompleteGameData
    {
        public GameResult result { get; set; }
    }

    public class UpdatePlayersData
    {
        public List<Guid> selectedPlayers { get; set; }
    }

}
