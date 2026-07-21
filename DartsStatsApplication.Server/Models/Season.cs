using DartsStatsApplication.Server.Controllers.Models;

namespace DartsStatsApplication.Server.Models
{
    /// <summary>
    /// Active while any Match linked to this season isn't Completed yet (or the
    /// season has no matches at all); Closed once it has at least one match and
    /// every one of them is Completed. Never stored - always computed by
    /// SeasonStatusCalculator, so it can't drift out of sync with reality.
    /// </summary>
    public enum SeasonStatus { Active, Closed }

    public class Season
    {
        public Guid Id { get; set; }

        public SeasonData data { get; set; }
    }
}
