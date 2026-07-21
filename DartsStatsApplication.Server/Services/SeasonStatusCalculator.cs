using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Services
{
    /// <summary>
    /// Pure, in-memory computation of a Season's status from the statuses of its
    /// linked Matches - kept separate from any document/session access so it stays
    /// unit-testable, the same way PlayerStatsCalculator is.
    /// </summary>
    public static class SeasonStatusCalculator
    {
        public static SeasonStatus Calculate(List<MatchStatus> linkedMatchStatuses)
        {
            if (linkedMatchStatuses.Count == 0) return SeasonStatus.Active;

            return linkedMatchStatuses.All(s => s == MatchStatus.Completed)
                ? SeasonStatus.Closed
                : SeasonStatus.Active;
        }
    }
}
