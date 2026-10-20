using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{

    public enum GameType { Singles, Doubles, Trebles }

    public enum GameStatus { Pending, Ready, InProgress, Complete }

    public enum GameResult { Win, Loss }

    /// <summary>The choice offered for a game once the league's late cutover time has passed on match day.</summary>
    public enum GamePlayMode { Normal, SingleLeg, ThrowForBull }

    public class Game
    {
        public Guid Id { get; set; }

        public GameData data { get; set; }

    }

    public class UpdatePlayerData
    {
        public List<Guid> availablePlayers { get; set; }
    }
}
