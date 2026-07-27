using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // IsValidToCompleteLeg/IsValidToCompleteLegByBullOff only inspect the Leg, the supplied
    // data, and (for bull-off) the pre-loaded Game; neither touches the IDocumentSession, so a
    // null session is safe here.
    public class LegControllerValidatorTests
    {
        private static Leg CreateLeg(LegStatus status, int remainingScore)
        {
            return new Leg
            {
                Id = Guid.NewGuid(),
                data = new LegData
                {
                    gameID = Guid.NewGuid(),
                    status = status,
                    score = new List<PlayerScore>(),
                    result = null,
                    finishDarts = null,
                    order = 0,
                    // At completion time the server-side remainingScore still holds the
                    // STARTING score, which is what the validator reconciles against.
                    remainingScore = remainingScore
                }
            };
        }

        private static Game CreateGame(int? maxRounds, int playerCount = 1)
        {
            var playerIds = new List<Guid>();
            for (int i = 0; i < playerCount; i++) playerIds.Add(Guid.NewGuid());

            return new Game
            {
                Id = Guid.NewGuid(),
                data = new GameData
                {
                    matchId = Guid.NewGuid(),
                    type = GameType.Singles,
                    status = GameStatus.InProgress,
                    playerIds = playerIds,
                    wonBull = false,
                    order = 0,
                    legsToPlay = 3,
                    startingScore = 501,
                    maxRounds = maxRounds,
                }
            };
        }

        private static CompleteLegData Complete(LegResult? result, int totalScored, int? finishDarts, int? remainingScore = null, int visits = 1)
        {
            // Split totalScored evenly across `visits` entries when a test cares about
            // round count; a single aggregated entry is enough otherwise, since the
            // reconciliation checks only sum the scores.
            var score = new List<PlayerScore>();
            if (visits <= 1)
            {
                score.Add(new PlayerScore { playerId = Guid.NewGuid(), score = totalScored });
            }
            else
            {
                int each = totalScored / visits;
                for (int i = 0; i < visits; i++)
                {
                    score.Add(new PlayerScore { playerId = Guid.NewGuid(), score = each });
                }
            }

            return new CompleteLegData
            {
                score = score,
                result = result,
                finishDarts = finishDarts,
                // Every test here uses a 501 starting score; default to the value that
                // actually reconciles unless a test explicitly wants a mismatch.
                remainingScore = remainingScore ?? (501 - totalScored)
            };
        }

        [Theory]
        [InlineData(LegStatus.Pending)]
        [InlineData(LegStatus.Completed)]
        public void IsValidToCompleteLeg_LegNotStarted_Throws(LegStatus status)
        {
            var leg = CreateLeg(status, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_NullResult_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(null, 501, 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_WinReconcilesExactlyWithValidFinishDarts_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            // 3 visits of 167 (a real, checkout-achievable total) rather than one
            // 501 entry - no single dart visit can reach past 180.
            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3, visits: 3)));

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(480)] // 160 x 3 - individually valid darts, just not 501
        [InlineData(483)] // 161 x 3
        public void IsValidToCompleteLeg_WinScoreDoesNotReconcile_Throws(int totalScored)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, totalScored, 3, visits: 3)));
        }

        [Theory]
        [InlineData(null)]
        [InlineData(0)]
        [InlineData(4)]
        public void IsValidToCompleteLeg_WinWithInvalidFinishDarts_Throws(int? finishDarts)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            // 3 visits of 167 (reconciling, checkout-achievable) isolates this test
            // to the finishDarts check specifically, rather than also failing the
            // (unrelated) per-visit dart-score check a single 501 entry would hit.
            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, finishDarts, visits: 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_ScoreEntryNotAchievableWithDarts_Throws()
        {
            // 179 is one of the 9 scores impossible to achieve with 3 real darts.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Assert.Throws<ValidationException>(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 179, null)));
            Assert.Contains("not a score that's possible", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLeg_WinCheckoutNotAchievableWithDouble_Throws()
        {
            // 180 + 162 + 159 = 501 - a genuinely reconciling Win, and every visit
            // is individually a real dart total - but 159 (the checkout visit) has
            // no combination that ends on a double, so it can't actually finish a leg.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var legData = new CompleteLegData
            {
                score = new List<PlayerScore>
                {
                    new PlayerScore { playerId = Guid.NewGuid(), score = 180 },
                    new PlayerScore { playerId = Guid.NewGuid(), score = 162 },
                    new PlayerScore { playerId = Guid.NewGuid(), score = 159 },
                },
                result = LegResult.Win,
                finishDarts = 3,
                remainingScore = 0,
            };

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(legData));
            Assert.Contains("can't be checked out", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLeg_LossWithScoreBelowStart_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            // A loss did not check out, and finishDarts is irrelevant. 6 visits of
            // 70 rather than one 420 entry - no single dart visit can reach past 180.
            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, visits: 6)));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteLeg_LossThatSumsToFullStart_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 501, null, visits: 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_RemainingScoreDoesNotReconcileWithScoreHistory_Throws()
        {
            // 420 scored against a 501 start reconciles to 81 remaining, not 0 - as if
            // the client sent a stale/wrong remainingScore alongside a correct score history.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Assert.Throws<ValidationException>(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, remainingScore: 0, visits: 6)));
            Assert.Contains("remainingScore does not reconcile", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLeg_RemainingScoreReconcilesForALoss_DoesNotThrow()
        {
            // Regression test for the "remainingScore is hardcoded to 0" bug: a Loss
            // leaves real, non-zero darts remaining, and the validator must accept -
            // not just tolerate - that non-zero value when it's the correct one.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Record.Exception(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, remainingScore: 81, visits: 6)));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLeg_WinPastMaxRoundsViaRealCheckout_DoesNotThrow()
        {
            // A genuine checkout throw is always a valid Win, regardless of how many
            // rounds it took to get there - maxRounds only forces a resolution once
            // NEITHER side has checked out, it never blocks a real checkout.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Record.Exception(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3, visits: 3)));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLeg_LossPastMaxRounds_DoesNotThrow()
        {
            // A normal Loss (the scorer confirming the opponent already checked out)
            // stays valid no matter how many rounds/throws preceded it.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Record.Exception(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, visits: 6)));

            Assert.Null(ex);
        }

        // ---- IsValidToSaveProgress ----

        [Fact]
        public void IsValidToSaveProgress_LegStarted_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Record.Exception(() => validator.IsValidToSaveProgress());

            Assert.Null(ex);
        }

        [Theory]
        [InlineData(LegStatus.Pending)]
        [InlineData(LegStatus.Completed)]
        public void IsValidToSaveProgress_LegNotStarted_Throws(LegStatus status)
        {
            var leg = CreateLeg(status, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToSaveProgress());
            Assert.Equal("Unable to save progress for a Leg that is not Started", ex.Message);
        }

        // ---- IsValidToCompleteLegByBullOff ----

        private static CompleteLegBullOffData BullOff(LegResult result, int visits)
        {
            var score = new List<PlayerScore>();
            for (int i = 0; i < visits; i++)
            {
                score.Add(new PlayerScore { playerId = Guid.NewGuid(), score = 60 });
            }
            return new CompleteLegBullOffData { score = score, result = result, remainingScore = 501 - (60 * visits) };
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_LegNotStarted_Throws()
        {
            var leg = CreateLeg(LegStatus.Pending, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 3), game));
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_NoMaxRoundsConfigured_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: null, playerCount: 1);

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 3), game));
            Assert.Contains("no max rounds configured", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_ThresholdNotReached_Throws()
        {
            // maxRounds=2, only 1 visit recorded - round 1 of 2, still short of the threshold.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 1), game));
            Assert.Contains("has not reached the max rounds", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_ExactlyAtMaxRounds_DoesNotThrow()
        {
            // maxRounds=2, exactly 2 visits recorded - the max round itself is the
            // last one played normally, so bull-off must already be available here,
            // without needing a 3rd round to be played first.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Record.Exception(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 2), game));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_ThresholdPassed_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Record.Exception(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 3), game));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLegByBullOff_ScoreEntryNotAchievableWithDarts_Throws()
        {
            // Past the maxRounds=2 threshold (3 visits recorded), but 179 was never
            // a real throw - the pre-threshold history is persisted as-is, so it
            // still has to be something a dartboard could actually produce.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);
            var data = new CompleteLegBullOffData
            {
                score = new List<PlayerScore>
                {
                    new PlayerScore { playerId = Guid.NewGuid(), score = 60 },
                    new PlayerScore { playerId = Guid.NewGuid(), score = 60 },
                    new PlayerScore { playerId = Guid.NewGuid(), score = 179 },
                },
                result = LegResult.Win,
                remainingScore = 202,
            };

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLegByBullOff(data, game));
            Assert.Contains("not a score that's possible", ex.Message);
        }
    }
}
