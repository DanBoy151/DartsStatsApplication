using System.Collections.Generic;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services
{
    public class SeasonStatusCalculatorTests
    {
        [Fact]
        public void Calculate_NoMatches_IsActive()
        {
            var status = SeasonStatusCalculator.Calculate(new List<MatchStatus>());
            Assert.Equal(SeasonStatus.Active, status);
        }

        [Fact]
        public void Calculate_AllMatchesCompleted_IsClosed()
        {
            var status = SeasonStatusCalculator.Calculate(new List<MatchStatus> { MatchStatus.Completed, MatchStatus.Completed });
            Assert.Equal(SeasonStatus.Closed, status);
        }

        [Fact]
        public void Calculate_SomeMatchesNotCompleted_IsActive()
        {
            var status = SeasonStatusCalculator.Calculate(new List<MatchStatus> { MatchStatus.Completed, MatchStatus.InProgress });
            Assert.Equal(SeasonStatus.Active, status);
        }

        [Theory]
        [InlineData(MatchStatus.Scheduled)]
        [InlineData(MatchStatus.Ready)]
        [InlineData(MatchStatus.InProgress)]
        public void Calculate_SingleMatchNotCompleted_IsActive(MatchStatus status)
        {
            var result = SeasonStatusCalculator.Calculate(new List<MatchStatus> { status });
            Assert.Equal(SeasonStatus.Active, result);
        }
    }
}
