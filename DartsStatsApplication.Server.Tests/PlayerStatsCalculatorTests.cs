using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services
{
    // PlayerStatsCalculator.Calculate() is pure - it only reads the Player/Leg
    // lists handed to it, never touches a session - so these tests build
    // everything in memory, the same way GameCompletionValidatorTests does.
    public class PlayerStatsCalculatorTests
    {
        private static Player MakePlayer(string name, out Guid id)
        {
            id = Guid.NewGuid();
            return new Player { Id = id, data = new PlayerData { name = name } };
        }

        private static PlayerScore Visit(Guid playerId, int score) => new PlayerScore { playerId = playerId, score = score };

        private static Leg MakeLeg(LegStatus status, LegResult? result, int? finishDarts, List<PlayerScore> score)
        {
            return new Leg
            {
                Id = Guid.NewGuid(),
                data = new LegData
                {
                    gameID = Guid.NewGuid(),
                    status = status,
                    score = score,
                    result = result,
                    finishDarts = finishDarts,
                    order = 0,
                    remainingScore = 0
                }
            };
        }

        [Fact]
        public void Calculate_PlayerWithNoLegs_ReturnsZeroedNullableStats()
        {
            var player = MakePlayer("Gary", out var id);

            var stats = PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg>());

            var result = Assert.Single(stats);
            Assert.Equal(id, result.playerId);
            Assert.Equal(0, result.legsPlayed);
            Assert.Null(result.winPercentage);
            Assert.Null(result.threeDartAverage);
            Assert.Null(result.firstNineAverage);
            Assert.Null(result.highestCheckout);
            Assert.Null(result.bestLegDarts);
        }

        [Fact]
        public void Calculate_SinglesWinByCheckout_ComputesAverageFirstNineAndHighestCheckout()
        {
            var player = MakePlayer("Dan", out var id);
            // 501: 180, 140, 100, 81 (checked out in 2 darts) = 501 over 4 visits.
            var leg = MakeLeg(LegStatus.Completed, LegResult.Win, finishDarts: 2, score: new List<PlayerScore>
            {
                Visit(id, 180), Visit(id, 140), Visit(id, 100), Visit(id, 81),
            });

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { leg }));

            Assert.Equal(1, result.legsPlayed);
            Assert.Equal(1, result.legsWon);
            Assert.Equal(0, result.legsLost);
            Assert.Equal(100.0, result.winPercentage);

            // darts = 3+3+3+2 = 11; points = 501; 3DA = 501/11*3 = 136.6(3)
            Assert.Equal(Math.Round(501.0 / 11 * 3, 1), result.threeDartAverage);

            // First 9 = first 3 visits (180+140+100=420) over 9 darts -> 420/9*3 = 140.0
            Assert.Equal(140.0, result.firstNineAverage);

            Assert.Equal(81, result.highestCheckout);
            Assert.Equal(11, result.bestLegDarts);
            Assert.Equal(1, result.maximums);
            Assert.Equal(1, result.ton40s);
            Assert.Equal(1, result.tons);
        }

        [Fact]
        public void Calculate_LostLeg_UsesThreeDartsForEveryVisitAndNoCheckoutStats()
        {
            var player = MakePlayer("Truk", out var id);
            var leg = MakeLeg(LegStatus.Completed, LegResult.Loss, finishDarts: null, score: new List<PlayerScore>
            {
                Visit(id, 60), Visit(id, 45),
            });

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { leg }));

            Assert.Equal(1, result.legsLost);
            Assert.Equal(0, result.legsWon);
            Assert.Equal(0.0, result.winPercentage);
            Assert.Equal(Math.Round(105.0 / 6 * 3, 1), result.threeDartAverage); // 6 darts (2 visits x 3), no checkout adjustment
            Assert.Null(result.highestCheckout);
            Assert.Null(result.bestLegDarts);
        }

        [Fact]
        public void Calculate_DoublesSharedLeg_CreditsBestLegToBothPlayersButCheckoutOnlyToThrower()
        {
            var partnerA = MakePlayer("Stu", out var aId);
            var partnerB = MakePlayer("Tweedie", out var bId);
            // Shared 601 leg, alternating: Stu 60, Tweedie 45, Stu 100, Tweedie checks out 41 in 2 darts.
            var leg = MakeLeg(LegStatus.Completed, LegResult.Win, finishDarts: 2, score: new List<PlayerScore>
            {
                Visit(aId, 60), Visit(bId, 45), Visit(aId, 100), Visit(bId, 41),
            });

            var stats = PlayerStatsCalculator.Calculate(new List<Player> { partnerA, partnerB }, new List<Leg> { leg });
            var statsA = stats.Find(s => s.playerId == aId)!;
            var statsB = stats.Find(s => s.playerId == bId)!;

            // Both were part of winning the leg together.
            Assert.Equal(1, statsA.legsWon);
            Assert.Equal(1, statsB.legsWon);

            // Leg total darts = 3(Stu 60) + 3(Tweedie 45) + 3(Stu 100) + 2(Tweedie checkout) = 11.
            Assert.Equal(11, statsA.bestLegDarts);
            Assert.Equal(11, statsB.bestLegDarts);

            // Only Tweedie actually threw the checkout.
            Assert.Null(statsA.highestCheckout);
            Assert.Equal(41, statsB.highestCheckout);

            // Each player's own average only counts their own throws: Stu = (60+100)/6*3 = 80.
            Assert.Equal(80.0, statsA.threeDartAverage);
        }

        [Fact]
        public void Calculate_PendingLeg_IsIgnoredEntirely()
        {
            var player = MakePlayer("Gary", out var id);
            var leg = MakeLeg(LegStatus.Pending, null, null, new List<PlayerScore>());

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { leg }));

            Assert.Equal(0, result.legsPlayed);
        }

        [Fact]
        public void Calculate_StartedLegInProgress_CountsTowardAveragesButNotWinLoss()
        {
            var player = MakePlayer("Dave S", out var id);
            var leg = MakeLeg(LegStatus.Started, null, null, new List<PlayerScore> { Visit(id, 60) });

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { leg }));

            Assert.Equal(1, result.legsPlayed);
            Assert.Equal(0, result.legsWon);
            Assert.Equal(0, result.legsLost);
            Assert.Null(result.winPercentage); // no decided legs yet
            Assert.NotNull(result.threeDartAverage);
        }

        [Fact]
        public void Calculate_FirstNineAverage_UsesOnlyFirstThreeVisitsAcrossMultipleLegs()
        {
            var player = MakePlayer("Tweedie", out var id);
            var leg1 = MakeLeg(LegStatus.Completed, LegResult.Loss, null, new List<PlayerScore>
            {
                Visit(id, 60), Visit(id, 60), Visit(id, 60), Visit(id, 20), // 4th visit must not count toward first-9
            });
            var leg2 = MakeLeg(LegStatus.Completed, LegResult.Loss, null, new List<PlayerScore>
            {
                Visit(id, 30), // fewer than 3 visits - uses however many exist
            });

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { leg1, leg2 }));

            // First-9 points = 60+60+60 (leg1's first 3) + 30 (leg2's only visit) = 210, over (9+3)=12 darts -> 210/12*3 = 52.5
            Assert.Equal(52.5, result.firstNineAverage);
        }

        [Fact]
        public void Calculate_BestLegDarts_PicksTheFewestAcrossMultipleWins()
        {
            var player = MakePlayer("Dan", out var id);
            var fastLeg = MakeLeg(LegStatus.Completed, LegResult.Win, finishDarts: 3, score: new List<PlayerScore>
            {
                Visit(id, 180), Visit(id, 180), Visit(id, 141), // 9 darts
            });
            var slowLeg = MakeLeg(LegStatus.Completed, LegResult.Win, finishDarts: 2, score: new List<PlayerScore>
            {
                Visit(id, 60), Visit(id, 60), Visit(id, 60), Visit(id, 60), Visit(id, 60), Visit(id, 61), // 5*3 + 2 = 17 darts
            });

            var result = Assert.Single(PlayerStatsCalculator.Calculate(new List<Player> { player }, new List<Leg> { slowLeg, fastLeg }));

            Assert.Equal(9, result.bestLegDarts);
        }

        [Fact]
        public void Calculate_ResultsAreOrderedByThreeDartAverageDescending()
        {
            var lowPlayer = MakePlayer("Low", out var lowId);
            var highPlayer = MakePlayer("High", out var highId);
            var lowLeg = MakeLeg(LegStatus.Completed, LegResult.Loss, null, new List<PlayerScore> { Visit(lowId, 20) });
            var highLeg = MakeLeg(LegStatus.Completed, LegResult.Loss, null, new List<PlayerScore> { Visit(highId, 140) });

            var results = PlayerStatsCalculator.Calculate(new List<Player> { lowPlayer, highPlayer }, new List<Leg> { lowLeg, highLeg });

            Assert.Equal("High", results[0].name);
            Assert.Equal("Low", results[1].name);
        }
    }
}
