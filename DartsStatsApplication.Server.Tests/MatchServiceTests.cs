using DartsStatsApplication.Server.Services;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services
{
    // ResolveOppositionHeadcountOutcome is a pure decision over two known
    // headcounts - no document session needed, unlike RecordOppositionHeadcount()
    // itself (which performs the actual Game-document mutation this outcome
    // implies, and is exercised manually/end-to-end instead - see the app's
    // "one Match In Progress at a time" global rule, which the e2e suite's
    // 07/08/09/10 spec files already document as making a second real match
    // impossible to drive through the browser for the rest of a test run).
    public class MatchServiceTests
    {
        [Fact]
        public void ResolveOppositionHeadcountOutcome_BothFullStrength_ReturnsNone()
        {
            var outcome = MatchService.ResolveOppositionHeadcountOutcome(6, oppositionShortHanded: false);

            Assert.Equal(HeadcountForfeitOutcome.None, outcome);
        }

        [Fact]
        public void ResolveOppositionHeadcountOutcome_OppositionShortWeAreFull_ReturnsWeWin()
        {
            var outcome = MatchService.ResolveOppositionHeadcountOutcome(6, oppositionShortHanded: true);

            Assert.Equal(HeadcountForfeitOutcome.WeWin, outcome);
        }

        [Fact]
        public void ResolveOppositionHeadcountOutcome_WeAreShortOppositionFull_ReturnsWeLose()
        {
            var outcome = MatchService.ResolveOppositionHeadcountOutcome(5, oppositionShortHanded: false);

            Assert.Equal(HeadcountForfeitOutcome.WeLose, outcome);
        }

        [Fact]
        public void ResolveOppositionHeadcountOutcome_BothShort_ReturnsVoid()
        {
            var outcome = MatchService.ResolveOppositionHeadcountOutcome(5, oppositionShortHanded: true);

            Assert.Equal(HeadcountForfeitOutcome.Void, outcome);
        }

        [Fact]
        public void ResolveOppositionHeadcountOutcome_MoreThanSixAvailable_TreatedAsFullStrength()
        {
            // A deep bench (more than 6 marked available) still counts as
            // "full strength" for this rule - only exactly 5 counts as short.
            var outcome = MatchService.ResolveOppositionHeadcountOutcome(7, oppositionShortHanded: false);

            Assert.Equal(HeadcountForfeitOutcome.None, outcome);
        }
    }
}
