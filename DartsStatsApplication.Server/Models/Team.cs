using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    public class Team
    {
        public Guid Id { get; set; }

        public TeamData data { get; set; }
    }
}
