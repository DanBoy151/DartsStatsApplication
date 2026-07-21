using DartsStatsApplication.Server.Services;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services
{
    public class PlayerFormCalculatorTests
    {
        [Fact]
        public void DetermineTrend_BothNull_ReturnsUnknown()
        {
            Assert.Equal("Unknown", PlayerFormCalculator.DetermineTrend(null, null));
        }

        [Fact]
        public void DetermineTrend_RecentAverageNull_ReturnsUnknown()
        {
            Assert.Equal("Unknown", PlayerFormCalculator.DetermineTrend(null, 55.0));
        }

        [Fact]
        public void DetermineTrend_CareerAverageNull_ReturnsUnknown()
        {
            Assert.Equal("Unknown", PlayerFormCalculator.DetermineTrend(55.0, null));
        }

        [Fact]
        public void DetermineTrend_ClearlyAboveThreshold_ReturnsIncreasing()
        {
            Assert.Equal("Increasing", PlayerFormCalculator.DetermineTrend(60.0, 50.0));
        }

        [Fact]
        public void DetermineTrend_ClearlyBelowThreshold_ReturnsDecreasing()
        {
            Assert.Equal("Decreasing", PlayerFormCalculator.DetermineTrend(45.0, 55.0));
        }

        [Theory]
        [InlineData(50.5, 50.0)]  // +0.5 exactly - boundary, not > threshold
        [InlineData(49.5, 50.0)]  // -0.5 exactly - boundary, not < -threshold
        [InlineData(50.0, 50.0)]  // no change at all
        public void DetermineTrend_AtOrWithinThreshold_ReturnsSteady(double recent, double career)
        {
            Assert.Equal("Steady", PlayerFormCalculator.DetermineTrend(recent, career));
        }

        [Fact]
        public void DetermineTrend_JustOverThreshold_ReturnsIncreasing()
        {
            Assert.Equal("Increasing", PlayerFormCalculator.DetermineTrend(50.51, 50.0));
        }

        [Fact]
        public void DetermineTrend_JustUnderNegativeThreshold_ReturnsDecreasing()
        {
            Assert.Equal("Decreasing", PlayerFormCalculator.DetermineTrend(49.49, 50.0));
        }
    }
}
