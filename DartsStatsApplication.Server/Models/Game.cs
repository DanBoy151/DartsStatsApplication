using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{

    public enum GameType { Singles, Doubles, Trebles }

    public enum GameStatus { Scheduled, InProgress, Completed }

    public enum GameResult { Win, Loss }

    public class Game
    {
        public Guid Id { get; set; }

        public GameData data { get; set; }

    }
}
