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
        /// </remarks>
        /// <param name="game">
        /// The leg's game, loaded by the caller (LegService.CompleteLeg) - used only to check
        /// the game's configured max rounds, if any. Null is safe (no game found, or the game
        /// has no league config - either way there's no round limit to enforce).
        /// </param>
        public void IsValidToCompleteLeg(CompleteLegData legData, Game? game)
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

            // Once a leg has passed the game's configured max rounds, it must be decided via
            // bull-off (IsValidToCompleteLegByBullOff), not a normal completion - defends
            // server-side against a client that bypasses the bull-off popup.
            if (game?.data.maxRounds != null)
            {
                int playersPerRound = Math.Max(game.data.playerIds?.Count ?? 1, 1);
                int roundsPlayed = RoundsPlayed(legData.score?.Count ?? 0, playersPerRound);
                if (roundsPlayed > game.data.maxRounds.Value)
                {
                    throw new ValidationException("Leg has passed the max rounds and must be decided via bull-off, not normal scoring");
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
        /// reached the game's configured max rounds - this is what the leg genuinely
        /// gets decided by once normal scoring is no longer an option.
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
            if (roundsPlayed <= game.data.maxRounds.Value)
            {
                throw new ValidationException("Leg has not reached the max rounds yet");
            }
        }
    }
}
