using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    public class Player
    {
        /// <summary>
        /// The ID of the player
        /// </summary>
        public Guid Id { get; set; }

        public PlayerData data { get; set; }

    }

}
