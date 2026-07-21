using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;

namespace DartsStatsApplication.Server.Services
{
    /// <summary>
    /// Aggregates every player's career stats from their leg history. Pure,
    /// in-memory, and takes already-loaded lists (mirrors how
    /// GameControllerValidator/LegControllerValidator work over pre-loaded
    /// data) so it stays unit-testable without a real Marten session.
    /// </summary>
    public static class PlayerStatsCalculator
    {
        public static List<PlayerStatsData> Calculate(List<Player> players, List<Leg> legs)
        {
            var results = new List<PlayerStatsData>();

            foreach (var player in players)
            {
                var stats = new PlayerStatsData
                {
                    playerId = player.Id,
                    name = player.data.name,
                };

                long totalPoints = 0;
                long totalDarts = 0;
                long first9Points = 0;
                long first9Darts = 0;
                int tons = 0;
                int ton40s = 0;
                int maximums = 0;
                int? highestCheckout = null;
                int? bestLegDarts = null;

                foreach (var leg in legs)
                {
                    // A Pending leg has no throws yet; Started and Completed both count
                    // (live-in-progress numbers, matching how the app already shows
                    // running stats for a leg that isn't finished yet).
                    if (leg.data.status == LegStatus.Pending) continue;

                    var playerVisits = leg.data.score?.Where(s => s.playerId == player.Id).ToList() ?? new List<PlayerScore>();
                    if (playerVisits.Count == 0) continue;

                    stats.legsPlayed++;

                    bool isCompleted = leg.data.status == LegStatus.Completed;
                    bool won = isCompleted && leg.data.result == LegResult.Win;
                    bool lost = isCompleted && leg.data.result == LegResult.Loss;
                    if (won) stats.legsWon++;
                    if (lost) stats.legsLost++;

                    // Was this player's last visit literally the leg-ending checkout
                    // throw? (Only meaningful on a Win - a Loss never checks out, and
                    // a bull-off win has no checkout visit at all - the leg just ends.)
                    bool tookCheckout = won && !leg.data.wonByBullOff && leg.data.score!.Count > 0 && leg.data.score[^1].playerId == player.Id;

                    for (int i = 0; i < playerVisits.Count; i++)
                    {
                        var visit = playerVisits[i];
                        bool isLastVisit = i == playerVisits.Count - 1;
                        // Every visit is 3 darts, except the winning checkout visit,
                        // which used however many darts finishDarts recorded.
                        int darts = (tookCheckout && isLastVisit) ? (leg.data.finishDarts ?? 3) : 3;

                        totalPoints += visit.score;
                        totalDarts += darts;

                        if (i < 3)
                        {
                            first9Points += visit.score;
                            first9Darts += darts;
                        }

                        if (visit.score == 180) maximums++;
                        else if (visit.score >= 140) ton40s++;
                        else if (visit.score >= 100) tons++;
                    }

                    if (tookCheckout)
                    {
                        int checkoutScore = playerVisits[^1].score;
                        if (highestCheckout is null || checkoutScore > highestCheckout) highestCheckout = checkoutScore;
                    }

                    // A bull-off win has no real checkout, so "leg total darts" would be
                    // meaningless (ComputeLegTotalDarts assumes the last visit finished it).
                    if (won && !leg.data.wonByBullOff)
                    {
                        int legTotalDarts = ComputeLegTotalDarts(leg);
                        if (bestLegDarts is null || legTotalDarts < bestLegDarts) bestLegDarts = legTotalDarts;
                    }
                }

                stats.tons = tons;
                stats.ton40s = ton40s;
                stats.maximums = maximums;
                stats.highestCheckout = highestCheckout;
                stats.bestLegDarts = bestLegDarts;

                int decided = stats.legsWon + stats.legsLost;
                stats.winPercentage = decided > 0 ? Math.Round((double)stats.legsWon / decided * 100, 1) : (double?)null;
                stats.threeDartAverage = totalDarts > 0 ? Math.Round((double)totalPoints / totalDarts * 3, 1) : (double?)null;
                stats.firstNineAverage = first9Darts > 0 ? Math.Round((double)first9Points / first9Darts * 3, 1) : (double?)null;

                results.Add(stats);
            }

            return results.OrderByDescending(r => r.threeDartAverage ?? -1).ToList();
        }

        private static int ComputeLegTotalDarts(Leg leg)
        {
            int visits = leg.data.score?.Count ?? 0;
            if (visits == 0) return 0;
            int lastVisitDarts = leg.data.finishDarts ?? 3;
            return ((visits - 1) * 3) + lastVisitDarts;
        }
    }
}
