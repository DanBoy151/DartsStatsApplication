namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// One row of the Player Statistics screen's expandable per-game table:
    /// a player's stats for a single Game (or, for the Overall section, for
    /// a whole Match), plus the context needed to recognise it.
    /// </summary>
    public class PlayerGameStatsData
    {
        /// <summary>The Game's id, or the Match's id when listed per match (no gameType filter).</summary>
        public Guid id { get; set; }

        public DateOnly date { get; set; }

        public string opponent { get; set; } = "";

        /// <summary>"Win" | "Loss" | "" (not recorded / still in progress).</summary>
        public string result { get; set; } = "";

        /// <summary>Names of the other players on this player's side. Empty for Singles and for per-match rows.</summary>
        public List<string> partners { get; set; } = new();

        public PlayerStatsData stats { get; set; } = new();
    }
}
