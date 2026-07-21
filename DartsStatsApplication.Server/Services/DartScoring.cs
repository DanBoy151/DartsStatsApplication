namespace DartsStatsApplication.Server.Services
{
    /// <summary>
    /// Which totals are actually achievable on a standard dartboard - the
    /// authoritative, server-side counterpart to the client's
    /// models/dartScoring.ts (kept in sync by construction: both start from
    /// the same real dartboard segments and the same "up to 3 darts" /
    /// "last dart must be a double" rules, computed once from first
    /// principles rather than hand-copied from a checkout chart).
    /// </summary>
    public static class DartScoring
    {
        public const int MaxScore = 180;

        private static readonly HashSet<int> AchievableUpTo3;
        private static readonly HashSet<int> CheckoutScores;

        static DartScoring()
        {
            var dartScores = SingleDartScores();
            var doubleScores = DoubleScores();

            // achievableByCount[k] = every total reachable with EXACTLY k darts.
            var achievableByCount = new List<HashSet<int>> { new HashSet<int> { 0 } };
            for (int k = 1; k <= 3; k++)
            {
                var prior = achievableByCount[k - 1];
                var next = new HashSet<int>();
                foreach (var sum in prior)
                {
                    foreach (var dart in dartScores)
                    {
                        int total = sum + dart;
                        if (total <= MaxScore) next.Add(total);
                    }
                }
                achievableByCount.Add(next);
            }

            AchievableUpTo3 = new HashSet<int>();
            foreach (var set in achievableByCount)
            {
                foreach (var total in set) AchievableUpTo3.Add(total);
            }

            // A valid checkout = some double, thrown last, preceded by 0-2 darts
            // (any segment) that account for the rest of the score.
            var achievableUpTo2 = new HashSet<int>();
            achievableUpTo2.UnionWith(achievableByCount[0]);
            achievableUpTo2.UnionWith(achievableByCount[1]);
            achievableUpTo2.UnionWith(achievableByCount[2]);

            CheckoutScores = new HashSet<int>();
            foreach (var d in doubleScores)
            {
                foreach (var lead in achievableUpTo2)
                {
                    int total = d + lead;
                    if (total <= MaxScore) CheckoutScores.Add(total);
                }
            }
        }

        // Every score a single dart can register: singles 1-20, doubles 2-40
        // (even) plus double bull (50), trebles 3-60 (multiples of 3), plus
        // single bull (25). A miss (0) isn't included - a visit's recorded
        // total already accounts for misses simply by using fewer darts.
        private static HashSet<int> SingleDartScores()
        {
            var scores = new HashSet<int>();
            for (int v = 1; v <= 20; v++)
            {
                scores.Add(v);       // single
                scores.Add(v * 2);   // double
                scores.Add(v * 3);   // treble
            }
            scores.Add(25);  // single bull
            scores.Add(50);  // double bull
            return scores;
        }

        private static List<int> DoubleScores()
        {
            var doubles = new List<int>();
            for (int v = 1; v <= 20; v++) doubles.Add(v * 2);
            doubles.Add(50);
            return doubles;
        }

        /// <summary>Is this a total that up to 3 real darts could actually produce? (e.g. 179 never can.)</summary>
        public static bool IsValidDartScore(int score)
        {
            return AchievableUpTo3.Contains(score);
        }

        /// <summary>Is this a total that up to 3 darts could produce ending on a double (the standard "must finish on a double" rule)?</summary>
        public static bool IsValidCheckoutScore(int score)
        {
            return CheckoutScores.Contains(score);
        }
    }
}
