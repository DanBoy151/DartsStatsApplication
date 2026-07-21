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
    // data, and the (pre-loaded, passed-in) Game; neither touches the IDocumentSession, so a
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

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3), null));
        }

        [Fact]
        public void IsValidToCompleteLeg_NullResult_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(null, 501, 3), null));
        }

        [Fact]
        public void IsValidToCompleteLeg_WinReconcilesExactlyWithValidFinishDarts_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3), null));

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(500)]
        [InlineData(502)]
        public void IsValidToCompleteLeg_WinScoreDoesNotReconcile_Throws(int totalScored)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, totalScored, 3), null));
        }

        [Theory]
        [InlineData(null)]
        [InlineData(0)]
        [InlineData(4)]
        public void IsValidToCompleteLeg_WinWithInvalidFinishDarts_Throws(int? finishDarts)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, finishDarts), null));
        }

        [Fact]
        public void IsValidToCompleteLeg_LossWithScoreBelowStart_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            // A loss did not check out, and finishDarts is irrelevant.
            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null), null));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteLeg_LossThatSumsToFullStart_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 501, null), null));
        }

        [Fact]
        public void IsValidToCompleteLeg_RemainingScoreDoesNotReconcileWithScoreHistory_Throws()
        {
            // 420 scored against a 501 start reconciles to 81 remaining, not 0 - as if
            // the client sent a stale/wrong remainingScore alongside a correct score history.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Assert.Throws<ValidationException>(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, remainingScore: 0), null));
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
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null, remainingScore: 81), null));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLeg_NoGame_IgnoresRoundLimit()
        {
            // A leg whose game couldn't be loaded (or has no league config) has no
            // round limit to enforce - normal completion still works.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var ex = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3), null));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLeg_GameWithNoMaxRounds_IgnoresRoundLimit()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: null);

            var ex = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3), game));

            Assert.Null(ex);
        }

        [Fact]
        public void IsValidToCompleteLeg_PastMaxRounds_Throws()
        {
            // 1 player, maxRounds=2: 3 visits already recorded means round 3 has
            // started - past the 2-round limit, so normal completion must be rejected.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Assert.Throws<ValidationException>(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 180, null, visits: 3), game));
            Assert.Contains("must be decided via bull-off", ex.Message);
        }

        [Fact]
        public void IsValidToCompleteLeg_AtMaxRounds_DoesNotThrow()
        {
            // Exactly at the limit (2 visits, maxRounds=2) - not past it yet, normal
            // completion is still allowed.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Record.Exception(
                () => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 120, null, visits: 2), game));

            Assert.Null(ex);
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
            // maxRounds=2, only 2 visits recorded - hasn't passed the threshold yet.
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);
            var game = CreateGame(maxRounds: 2, playerCount: 1);

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCompleteLegByBullOff(BullOff(LegResult.Win, 2), game));
            Assert.Contains("has not reached the max rounds", ex.Message);
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
    }
}
