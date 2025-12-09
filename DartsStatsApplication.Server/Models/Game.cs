using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{

    public enum GameType { Singles, Doubles, Trebles }

    public enum GameStatus { Pending, Ready, InProgress, Complete }

    public enum GameResult { Win, Loss }

    public class Game
    {
        public Guid Id { get; set; }

        public GameData data { get; set; }

    }
}
