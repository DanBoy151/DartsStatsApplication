using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    public class League
    {
        public Guid Id { get; set; }

        public LeagueData data { get; set; }
    }
}
