using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Controllers.Models
{

    public class LegData
    {
        public Guid gameID { get; set; }

        public LegStatus status { get; set; }

        public Dictionary<Guid, int>? score { get; set; }

        public LegResult? result { get; set; }

        public int? finishDarts { get; set; }

    }

    public class CompleteLegData
    {
        public Guid Id { get; set; }

        public Dictionary<Guid, int>? score { get; set; }

        public LegResult? result { get; set; }

        public int? finishDarts { get; set; }
    }

}
