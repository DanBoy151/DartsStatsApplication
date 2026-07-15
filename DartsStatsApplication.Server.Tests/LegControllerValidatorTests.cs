using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // IsValidToCompleteLeg only inspects the Leg and the supplied CompleteLegData;
    // it never touches the IDocumentSession, so a null session is safe here.
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

        private static CompleteLegData Complete(LegResult? result, int totalScored, int? finishDarts)
        {
            return new CompleteLegData
            {
                // A single aggregated entry is enough; the validator only sums the scores.
                score = new List<PlayerScore>
                {
                    new PlayerScore { playerId = Guid.NewGuid(), score = totalScored }
                },
                result = result,
                finishDarts = finishDarts
            };
        }

        [Theory]
        [InlineData(LegStatus.Pending)]
        [InlineData(LegStatus.Completed)]
        public void IsValidToCompleteLeg_LegNotStarted_Throws(LegStatus status)
        {
            var leg = CreateLeg(status, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<Exception>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_NullResult_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<Exception>(() => validator.IsValidToCompleteLeg(Complete(null, 501, 3)));
        }

        [Fact]
        public void IsValidToCompleteLeg_WinReconcilesExactlyWithValidFinishDarts_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, 3)));

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(500)]
        [InlineData(502)]
        public void IsValidToCompleteLeg_WinScoreDoesNotReconcile_Throws(int totalScored)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<Exception>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, totalScored, 3)));
        }

        [Theory]
        [InlineData(null)]
        [InlineData(0)]
        [InlineData(4)]
        public void IsValidToCompleteLeg_WinWithInvalidFinishDarts_Throws(int? finishDarts)
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<Exception>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Win, 501, finishDarts)));
        }

        [Fact]
        public void IsValidToCompleteLeg_LossWithScoreBelowStart_DoesNotThrow()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            // A loss did not check out, and finishDarts is irrelevant.
            var exception = Record.Exception(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 420, null)));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteLeg_LossThatSumsToFullStart_Throws()
        {
            var leg = CreateLeg(LegStatus.Started, 501);
            var validator = new LegControllerValidator(leg, null!);

            Assert.Throws<Exception>(() => validator.IsValidToCompleteLeg(Complete(LegResult.Loss, 501, null)));
        }
    }
}
