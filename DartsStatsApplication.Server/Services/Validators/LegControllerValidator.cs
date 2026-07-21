using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public class LegControllerValidator
    {
        private Leg _leg;
        private readonly IDocumentSession _documentSession;

        public LegControllerValidator(Leg leg, IDocumentSession documentSession)
        {
            _leg = leg;
            _documentSession = documentSession;
        }

        /// <summary>
        /// One-based: every player throws once per round, so the count-th throw (1-based)
        /// belongs to round ceil(count / playersPerRound). Shared by the round-limit check
        /// below and IsValidToCompleteLegByBullOff, so the math isn't duplicated.
        /// </summary>
        private static int RoundsPlayed(int throwCount, int playersPerRound)
        {
            return (int)Math.Ceiling((double)throwCount / Math.Max(playersPerRound, 1));
        }

        /// <summary>
        /// Validate that a leg can be completed with the supplied result/score/darts.
        /// Throws on any rule violation (matching the Game/Leg validator convention).
        /// </summary>
        /// <remarks>
        /// Note: the server never decrements <c>_leg.data.remainingScore</c> during play
        /// (intermediate throws live only in the client store), so at completion time
        /// <c>_leg.data.remainingScore</c> still holds the leg's STARTING score
        /// (501 Singles / 601 Doubles / 701 Trebles) and is used here as the reconciliation
        /// target. The supplied <paramref name="legData"/>.score is the full ordered history
        /// of every throw; busts are recorded as 0 entries, so a won leg sums exactly to the
        /// starting score and a lost leg sums to less than it.
        ///
        /// A normal Win or Loss stays valid at any round count, including past the game's
        /// configured max rounds - a real checkout, or the scorer confirming the opponent
        /// already checked out, both end the leg legitimately without needing a bull-off.
        /// Bull-off (<see cref="IsValidToCompleteLegByBullOff"/>) is only for the remaining
        /// case: past max rounds, with neither side having checked out.
        /// </remarks>
        public void IsValidToCompleteLeg(CompleteLegData legData)
        {
            // Leg must be in progress: reject Pending (never started) and Completed (already done).
            if (_leg.data.status != LegStatus.Started)
            {
                throw new ValidationException("Unable to complete a Leg that is not Started");
            }

            // A result is required to complete a leg.
            if (legData.result == null)
            {
                throw new ValidationException("A Leg result (Win/Loss) is required to complete the Leg");
            }

            // Every recorded visit must actually be throwable on a real dartboard -
            // defends server-side against a client that bypasses (or predates) the
            // equivalent check in EnterScorePanel.vue.
            if (legData.score != null)
            {
                foreach (var entry in legData.score)
                {
                    if (!DartScoring.IsValidDartScore(entry.score))
                    {
                        throw new ValidationException($"{entry.score} is not a score that's possible with up to 3 darts");
                    }
                }
            }

            int startingScore = _leg.data.remainingScore;
            int totalScored = 0;
            if (legData.score != null)
            {
                foreach (var entry in legData.score)
                {
                    totalScored += entry.score;
                }
            }

            // The submitted remainingScore must itself be consistent with the submitted
            // score history - it's persisted as sent (see LegService.CompleteLeg), not
            // recomputed, so this is what keeps it from drifting away from the truth.
            int expectedRemaining = startingScore - totalScored;
            if (legData.remainingScore != expectedRemaining)
            {
                throw new ValidationException(
                    $"remainingScore does not reconcile with the submitted score. Expected {expectedRemaining}, got {legData.remainingScore}");
            }

            if (legData.result == LegResult.Win)
            {
                // A won leg must reconcile exactly to the starting score (checked out to zero).
                if (totalScored != startingScore)
                {
                    throw new ValidationException(
                        $"Winning Leg score does not reconcile. Expected {startingScore}, got {totalScored}");
                }

                // The finishing visit must record a plausible dart count (1-3).
                if (legData.finishDarts == null || legData.finishDarts < 1 || legData.finishDarts > 3)
                {
                    throw new ValidationException("A winning Leg requires a finish dart count between 1 and 3");
                }

                // The checkout itself must be reachable with the last dart landing on
                // a double - the standard "must finish on a double" rule. score is
                // guaranteed non-empty here: totalScored (summed from it) just
                // reconciled to startingScore, which is always > 0.
                var checkoutVisit = legData.score![legData.score.Count - 1];
                if (!DartScoring.IsValidCheckoutScore(checkoutVisit.score))
                {
                    throw new ValidationException($"{checkoutVisit.score} can't be checked out - the last dart must land on a double");
                }
            }
            else // LegResult.Loss
            {
                // A lost leg did not check out, so the running total must be below the starting score.
                if (totalScored >= startingScore)
                {
                    throw new ValidationException(
                        $"Losing Leg score is invalid. Total scored ({totalScored}) must be less than the starting score ({startingScore})");
                }
            }
        }

        /// <summary>
        /// Validate that a leg can be completed via bull-off: it must actually have
        /// reached the game's configured max rounds - the max round itself is the
        /// last one played normally, so this doesn't require an extra round beyond
        /// the limit before a bull-off is available.
        /// </summary>
        public void IsValidToCompleteLegByBullOff(CompleteLegBullOffData data, Game? game)
        {
            if (_leg.data.status != LegStatus.Started)
            {
                throw new ValidationException("Unable to complete a Leg that is not Started");
            }

            if (game?.data.maxRounds == null)
            {
                throw new ValidationException("This Game has no max rounds configured - a Leg can't be decided by bull-off");
            }

            int playersPerRound = Math.Max(game.data.playerIds?.Count ?? 1, 1);
            int roundsPlayed = RoundsPlayed(data.score?.Count ?? 0, playersPerRound);
            if (roundsPlayed < game.data.maxRounds.Value)
            {
                throw new ValidationException("Leg has not reached the max rounds yet");
            }

            // The real pre-threshold throws are persisted as-is (see
            // LegService.CompleteLegByBullOff) - each still has to be something a
            // dartboard can actually produce. No checkout-specific check here: a
            // bull-off-decided leg never has a real checkout visit by definition.
            if (data.score != null)
            {
                foreach (var entry in data.score)
                {
                    if (!DartScoring.IsValidDartScore(entry.score))
                    {
                        throw new ValidationException($"{entry.score} is not a score that's possible with up to 3 darts");
                    }
                }
            }
        }
    }
}
