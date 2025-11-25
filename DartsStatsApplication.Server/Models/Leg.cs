using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    public enum LegStatus { Started, Completed }

    public enum LegResult { Win, Loss }

    public class Leg
    {
        public Guid Id { get; set; }

        public LegData data { get; set; }
    }
}
