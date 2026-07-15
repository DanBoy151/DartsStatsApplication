using DartsStatsApplication.Server.Controllers.Models;
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
        public void IsValidToCompleteLeg(CompleteLegData legData)
        {
            // Leg must be in progress: reject Pending (never started) and Completed (already done).
            if (_leg.data.status != LegStatus.Started)
            {
                throw new Exception("Unable to complete a Leg that is not Started");
            }

            // A result is required to complete a leg.
            if (legData.result == null)
            {
                throw new Exception("A Leg result (Win/Loss) is required to complete the Leg");
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

            if (legData.result == LegResult.Win)
            {
                // A won leg must reconcile exactly to the starting score (checked out to zero).
                if (totalScored != startingScore)
                {
                    throw new Exception(
                        $"Winning Leg score does not reconcile. Expected {startingScore}, got {totalScored}");
                }

                // The finishing visit must record a plausible dart count (1-3).
                if (legData.finishDarts == null || legData.finishDarts < 1 || legData.finishDarts > 3)
                {
                    throw new Exception("A winning Leg requires a finish dart count between 1 and 3");
                }
            }
            else // LegResult.Loss
            {
                // A lost leg did not check out, so the running total must be below the starting score.
                if (totalScored >= startingScore)
                {
                    throw new Exception(
                        $"Losing Leg score is invalid. Total scored ({totalScored}) must be less than the starting score ({startingScore})");
                }
            }
        }
    }
}
