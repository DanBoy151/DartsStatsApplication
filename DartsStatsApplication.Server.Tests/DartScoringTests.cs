using DartsStatsApplication.Server.Services;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services
{
    public class DartScoringTests
    {
        [Theory]
        [InlineData(0)]
        [InlineData(180)]
        [InlineData(60)]  // T20
        [InlineData(50)]  // double bull
        [InlineData(40)]  // D20
        [InlineData(25)]  // single bull
        public void IsValidDartScore_AcceptsRealTotals(int score)
        {
            Assert.True(DartScoring.IsValidDartScore(score));
        }

        [Theory]
        [InlineData(163)]
        [InlineData(166)]
        [InlineData(169)]
        [InlineData(172)]
        [InlineData(173)]
        [InlineData(175)]
        [InlineData(176)]
        [InlineData(178)]
        [InlineData(179)]
        public void IsValidDartScore_RejectsTheNineImpossibleScores(int score)
        {
            // A well-known darts fact, and exactly what the static achievable set
            // computes from first principles - see DartScoring's header comment.
            Assert.False(DartScoring.IsValidDartScore(score));
        }

        [Fact]
        public void IsValidDartScore_AcceptsEveryOtherScoreFromZeroTo180()
        {
            var impossible = new HashSet<int> { 163, 166, 169, 172, 173, 175, 176, 178, 179 };
            for (int score = 0; score <= 180; score++)
            {
                if (impossible.Contains(score)) continue;
                Assert.True(DartScoring.IsValidDartScore(score), $"expected {score} to be achievable");
            }
        }

        [Theory]
        [InlineData(181)]
        [InlineData(-1)]
        public void IsValidDartScore_RejectsOutOfRange(int score)
        {
            Assert.False(DartScoring.IsValidDartScore(score));
        }

        [Fact]
        public void IsValidCheckoutScore_Accepts170_TheHighestPossibleCheckout()
        {
            Assert.True(DartScoring.IsValidCheckoutScore(170));
        }

        [Fact]
        public void IsValidCheckoutScore_Rejects180_TheHighestScoreButNotAValidCheckout()
        {
            Assert.True(DartScoring.IsValidDartScore(180));
            Assert.False(DartScoring.IsValidCheckoutScore(180));
        }

        [Theory]
        [InlineData(2)]
        [InlineData(40)]
        [InlineData(50)] // double bull
        public void IsValidCheckoutScore_AcceptsEveryDoubleOnItsOwn(int score)
        {
            Assert.True(DartScoring.IsValidCheckoutScore(score));
        }

        [Fact]
        public void IsValidCheckoutScore_Rejects1_ValidScoreButNoDoubleScoresOne()
        {
            Assert.True(DartScoring.IsValidDartScore(1));
            Assert.False(DartScoring.IsValidCheckoutScore(1));
        }

        [Theory]
        [InlineData(159)]
        [InlineData(162)]
        [InlineData(165)]
        [InlineData(168)]
        public void IsValidCheckoutScore_RejectsRealScoresWithNoDoubleEndingCombination(int score)
        {
            Assert.True(DartScoring.IsValidDartScore(score));
            Assert.False(DartScoring.IsValidCheckoutScore(score));
        }

        [Fact]
        public void IsValidCheckoutScore_Accepts121()
        {
            // e.g. T17, D15, D20 (51 + 30 + 40 = 121).
            Assert.True(DartScoring.IsValidCheckoutScore(121));
        }

        [Theory]
        [InlineData(171)]
        [InlineData(1)]
        [InlineData(0)]
        public void IsValidCheckoutScore_RejectsOutOfRange(int score)
        {
            Assert.False(DartScoring.IsValidCheckoutScore(score));
        }
    }
}
