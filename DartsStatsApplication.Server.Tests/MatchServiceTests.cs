using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
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

        // ReconcileOppositionHeadcount works purely on in-memory documents, so
        // (unlike RecordOppositionHeadcount itself) it's covered here directly.

        private static Game Singles(int order, GameStatus status = GameStatus.Pending, GameResult? result = null, bool forfeited = false)
        {
            return new Game
            {
                Id = Guid.NewGuid(),
                data = new GameData
                {
                    type = GameType.Singles,
                    order = order,
                    status = status,
                    result = result,
                    forfeited = forfeited,
                },
            };
        }

        private static Func<Game> NoReplacementExpected =>
            () => throw new InvalidOperationException("No replacement Singles game should be needed");

        [Fact]
        public void ReconcileOppositionHeadcount_OppositionShort_ForfeitsLastSinglesAsWinAndCountsIt()
        {
            var match = new MatchData { gamesFor = 2, gamesAgainst = 1 };
            var first = Singles(5);
            var last = Singles(10);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { first, last }, HeadcountForfeitOutcome.WeWin, NoReplacementExpected);

            Assert.Equal(GameStatus.Complete, last.data.status);
            Assert.Equal(GameResult.Win, last.data.result);
            Assert.True(last.data.forfeited);
            Assert.False(first.data.forfeited);
            Assert.Equal(3, match.gamesFor);
            Assert.Equal(1, match.gamesAgainst);
            Assert.True(match.oppositionHeadcountResolved);
            Assert.Equal(new[] { last }, result.GamesToStore);
            Assert.Null(result.GameToDelete);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_UntickingAfterAWalkoverWin_RestoresTheGameAndTheScore()
        {
            var match = new MatchData { gamesFor = 3, gamesAgainst = 1, oppositionHeadcountResolved = true };
            var last = Singles(10, GameStatus.Complete, GameResult.Win, forfeited: true);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { Singles(5), last }, HeadcountForfeitOutcome.None, NoReplacementExpected);

            Assert.Equal(GameStatus.Pending, last.data.status);
            Assert.Null(last.data.result);
            Assert.False(last.data.forfeited);
            Assert.Equal(2, match.gamesFor);
            Assert.Equal(1, match.gamesAgainst);
            Assert.False(match.oppositionHeadcountResolved);
            Assert.Equal(new[] { last }, result.GamesToStore);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_UndoingAWalkoverLoss_TakesThePointBackOffGamesAgainst()
        {
            var match = new MatchData { gamesFor = 0, gamesAgainst = 1, oppositionHeadcountResolved = true };
            var last = Singles(10, GameStatus.Complete, GameResult.Loss, forfeited: true);

            MatchService.ReconcileOppositionHeadcount(match, new List<Game> { last }, HeadcountForfeitOutcome.None, NoReplacementExpected);

            Assert.Equal(0, match.gamesFor);
            Assert.Equal(0, match.gamesAgainst);
            Assert.False(last.data.forfeited);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_SameOutcomeAgain_ChangesNothing()
        {
            // A plain re-Proceed with the box still ticked must not count the walkover twice.
            var match = new MatchData { gamesFor = 1, oppositionHeadcountResolved = true };
            var last = Singles(10, GameStatus.Complete, GameResult.Win, forfeited: true);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { last }, HeadcountForfeitOutcome.WeWin, NoReplacementExpected);

            Assert.Equal(1, match.gamesFor);
            Assert.Empty(result.GamesToStore);
            Assert.Null(result.GameToDelete);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_WinTurningIntoLoss_MovesThePointAcross()
        {
            // Our own roster dropped to 5 and the box was unticked - the same
            // last Singles game flips from a walkover win to a walkover loss.
            var match = new MatchData { gamesFor = 1, gamesAgainst = 0, oppositionHeadcountResolved = true };
            var last = Singles(10, GameStatus.Complete, GameResult.Win, forfeited: true);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { last }, HeadcountForfeitOutcome.WeLose, NoReplacementExpected);

            Assert.Equal(GameResult.Loss, last.data.result);
            Assert.True(last.data.forfeited);
            Assert.Equal(0, match.gamesFor);
            Assert.Equal(1, match.gamesAgainst);
            Assert.Single(result.GamesToStore);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_BothShort_DeletesTheLastSinglesGame()
        {
            var match = new MatchData();
            var last = Singles(10);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { Singles(5), last }, HeadcountForfeitOutcome.Void, NoReplacementExpected);

            Assert.Same(last, result.GameToDelete);
            Assert.Empty(result.GamesToStore);
            Assert.True(match.oppositionHeadcountResolved);
            Assert.Equal(0, match.gamesFor);
            Assert.Equal(0, match.gamesAgainst);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_UndoingAVoid_RecreatesTheDeletedSinglesGame()
        {
            var match = new MatchData { oppositionHeadcountResolved = true };
            var replacement = Singles(10);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { Singles(5) }, HeadcountForfeitOutcome.None, () => replacement);

            Assert.Equal(new[] { replacement }, result.GamesToStore);
            Assert.Null(result.GameToDelete);
            Assert.False(match.oppositionHeadcountResolved);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_VoidTurningIntoWin_ForfeitsTheRecreatedGame()
        {
            var match = new MatchData { oppositionHeadcountResolved = true };
            var replacement = Singles(10);

            var result = MatchService.ReconcileOppositionHeadcount(match, new List<Game> { Singles(5) }, HeadcountForfeitOutcome.WeWin, () => replacement);

            Assert.True(replacement.data.forfeited);
            Assert.Equal(GameResult.Win, replacement.data.result);
            Assert.Equal(1, match.gamesFor);
            Assert.Equal(new[] { replacement }, result.GamesToStore);
        }

        [Fact]
        public void ReconcileOppositionHeadcount_LastSinglesAlreadyPlayed_Throws()
        {
            var match = new MatchData();
            var last = Singles(10, GameStatus.InProgress);

            Assert.Throws<ValidationException>(() =>
                MatchService.ReconcileOppositionHeadcount(match, new List<Game> { last }, HeadcountForfeitOutcome.WeWin, NoReplacementExpected));
        }

        [Fact]
        public void CurrentHeadcountOutcome_ReadsTheAppliedOutcomeFromTheGames()
        {
            Assert.Equal(HeadcountForfeitOutcome.None, MatchService.CurrentHeadcountOutcome(new[] { Singles(1) }, headcountResolved: false));
            Assert.Equal(HeadcountForfeitOutcome.WeWin, MatchService.CurrentHeadcountOutcome(new[] { Singles(1, GameStatus.Complete, GameResult.Win, true) }, headcountResolved: true));
            Assert.Equal(HeadcountForfeitOutcome.WeLose, MatchService.CurrentHeadcountOutcome(new[] { Singles(1, GameStatus.Complete, GameResult.Loss, true) }, headcountResolved: true));
            Assert.Equal(HeadcountForfeitOutcome.Void, MatchService.CurrentHeadcountOutcome(new[] { Singles(1) }, headcountResolved: true));
        }
    }
}
