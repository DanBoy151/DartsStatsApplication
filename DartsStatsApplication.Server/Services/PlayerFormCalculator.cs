namespace DartsStatsApplication.Server.Services
{
    /// <summary>
    /// The pure decision rule behind a player's "current form" indicator -
    /// pulled out of PlayerController.GetPlayerForm (which does the actual
    /// session queries/joins to produce the two averages this compares) so
    /// it stays unit-testable, matching how GameControllerValidator/
    /// LegControllerValidator split pure rules from session-touching lookups.
    /// </summary>
    public static class PlayerFormCalculator
    {
        private const double TrendThreshold = 0.5;

        /// <summary>
        /// Compares the pooled 3-dart average across a player's last 5
        /// completed Singles games to their all-time Singles average.
        /// </summary>
        public static string DetermineTrend(double? recentAverage, double? careerAverage)
        {
            if (recentAverage == null || careerAverage == null)
            {
                return "Unknown";
            }

            double diff = recentAverage.Value - careerAverage.Value;

            if (diff > TrendThreshold) return "Increasing";
            if (diff < -TrendThreshold) return "Decreasing";
            return "Steady";
        }
    }
}
