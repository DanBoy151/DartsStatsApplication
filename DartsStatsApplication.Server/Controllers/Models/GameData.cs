using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{
    public class GameData
    {
        public Guid matchId { get; set; }

        public GameType type { get; set; }

        public GameStatus status { get; set; }

        public List<Guid> playerIds { get; set; }

        public GameResult? result { get; set; }
    }

    public class CompleteGameData
    {
        public Guid Id { get; set; }

        public GameResult result { get; set; }
    }

}
