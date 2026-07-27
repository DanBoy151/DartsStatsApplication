using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // IsValidToCompleteMatch reads the Match plus the List<Game> passed in. It never
    // touches the IDocumentSession, so a null session is safe here (the caller does the
    // game query and passes the results in).
    public class MatchControllerValidatorTests
    {
        private static Match CreateMatch(Guid? playerOfMatch)
        {
            return new Match
            {
                Id = Guid.NewGuid(),
                data = new MatchData
                {
                    status = MatchStatus.Completed,
                    opponent = "",
                    playerOfMatch = playerOfMatch,
                    availablePlayers = new List<Guid>(),
                    gamesFor = 0,
                    gamesAgainst = 0
                }
            };
        }

        private static Game MakeGame(GameStatus status, List<Guid> playerIds)
        {
            return new Game
            {
                Id = Guid.NewGuid(),
                data = new GameData
                {
                    matchId = Guid.NewGuid(),
                    type = GameType.Singles,
                    status = status,
                    playerIds = playerIds,
                    wonBull = false,
                    result = null,
                    order = 0
                }
            };
        }

        [Fact]
        public void IsValidToCompleteMatch_AllGamesCompleteAndPlayerPlayed_ReturnsEmpty()
        {
            var player = Guid.NewGuid();
            var match = CreateMatch(player);
            var validator = new MatchControllerValidator(match, null!);
            var games = new List<Game>
            {
                MakeGame(GameStatus.Complete, new List<Guid> { player }),
                MakeGame(GameStatus.Complete, new List<Guid> { Guid.NewGuid() })
            };

            Assert.Equal(string.Empty, validator.IsValidToCompleteMatch(games));
        }

        [Fact]
        public void IsValidToCompleteMatch_NoGames_ReturnsError()
        {
            var match = CreateMatch(Guid.NewGuid());
            var validator = new MatchControllerValidator(match, null!);

            Assert.NotEqual(string.Empty, validator.IsValidToCompleteMatch(new List<Game>()));
        }

        [Fact]
        public void IsValidToCompleteMatch_GameNotComplete_ReturnsError()
        {
            var player = Guid.NewGuid();
            var match = CreateMatch(player);
            var validator = new MatchControllerValidator(match, null!);
            var games = new List<Game>
            {
                MakeGame(GameStatus.Complete, new List<Guid> { player }),
                MakeGame(GameStatus.InProgress, new List<Guid> { player })
            };

            Assert.NotEqual(string.Empty, validator.IsValidToCompleteMatch(games));
        }

        [Fact]
        public void IsValidToCompleteMatch_PlayerOfMatchNull_ReturnsError()
        {
            var match = CreateMatch(null);
            var validator = new MatchControllerValidator(match, null!);
            var games = new List<Game> { MakeGame(GameStatus.Complete, new List<Guid> { Guid.NewGuid() }) };

            Assert.NotEqual(string.Empty, validator.IsValidToCompleteMatch(games));
        }

        [Fact]
        public void IsValidToCompleteMatch_PlayerOfMatchDidNotPlay_ReturnsError()
        {
            var match = CreateMatch(Guid.NewGuid()); // POTM not in any game
            var validator = new MatchControllerValidator(match, null!);
            var games = new List<Game> { MakeGame(GameStatus.Complete, new List<Guid> { Guid.NewGuid() }) };

            Assert.NotEqual(string.Empty, validator.IsValidToCompleteMatch(games));
        }

        [Fact]
        public void IsValidToCompleteMatch_GamesIncompleteAndPlayerNull_ReturnsGamesErrorFirst()
        {
            // Both the games check and the player check would fail. The aggregation must
            // return the FIRST (games) error -- this is the regression guard for the bug
            // where the games result was overwritten by the player result.
            var match = CreateMatch(null);
            var validator = new MatchControllerValidator(match, null!);
            var games = new List<Game> { MakeGame(GameStatus.InProgress, new List<Guid>()) };

            var result = validator.IsValidToCompleteMatch(games);

            Assert.Contains("Games that are not Complete", result);
        }

        private static MatchData ValidNewMatchData()
        {
            return new MatchData
            {
                status = MatchStatus.Scheduled,
                opponent = "The Rovers",
                date = DateOnly.FromDateTime(DateTime.Today),
                location = Location.Home,
                gamesFor = 0,
                gamesAgainst = 0
            };
        }

        [Fact]
        public void ValidateNewMatch_ValidData_DoesNotThrow()
        {
            var ex = Record.Exception(() => MatchControllerValidator.ValidateNewMatch(ValidNewMatchData()));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateNewMatch_BlankOpponent_Throws(string? opponent)
        {
            var data = ValidNewMatchData();
            data.opponent = opponent!;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateNewMatch(data));
            Assert.Equal("Opponent is required", ex.Message);
        }

        [Fact]
        public void ValidateNewMatch_OpponentOverMaxLength_Throws()
        {
            var data = ValidNewMatchData();
            data.opponent = new string('a', 201);

            Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateNewMatch(data));
        }

        [Fact]
        public void ValidateNewMatch_DateNotSet_Throws()
        {
            var data = ValidNewMatchData();
            data.date = default;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateNewMatch(data));
            Assert.Equal("Date is required", ex.Message);
        }

        [Theory]
        [InlineData(MatchStatus.Ready)]
        [InlineData(MatchStatus.InProgress)]
        [InlineData(MatchStatus.Completed)]
        public void ValidateNewMatch_NonScheduledStatus_Throws(MatchStatus status)
        {
            var data = ValidNewMatchData();
            data.status = status;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateNewMatch(data));
            Assert.Equal("New matches must be created with Scheduled status", ex.Message);
        }

        private static Match ScheduledMatch()
        {
            return new Match { Id = Guid.NewGuid(), data = ValidNewMatchData() };
        }

        [Fact]
        public void ValidateEditMatch_ScheduledMatchValidData_DoesNotThrow()
        {
            var match = ScheduledMatch();

            var ex = Record.Exception(() => MatchControllerValidator.ValidateEditMatch(match, ValidNewMatchData()));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData(MatchStatus.Ready)]
        [InlineData(MatchStatus.InProgress)]
        [InlineData(MatchStatus.Completed)]
        public void ValidateEditMatch_MatchNotScheduled_Throws(MatchStatus status)
        {
            var match = ScheduledMatch();
            match.data.status = status;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateEditMatch(match, ValidNewMatchData()));
            Assert.Equal("Unable to edit a Match that is not Scheduled", ex.Message);
        }

        [Fact]
        public void ValidateEditMatch_BlankOpponent_Throws()
        {
            var match = ScheduledMatch();
            var data = ValidNewMatchData();
            data.opponent = "";

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateEditMatch(match, data));
            Assert.Equal("Opponent is required", ex.Message);
        }

        [Fact]
        public void ValidateEditMatch_DateNotSet_Throws()
        {
            var match = ScheduledMatch();
            var data = ValidNewMatchData();
            data.date = default;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateEditMatch(match, data));
            Assert.Equal("Date is required", ex.Message);
        }

        [Fact]
        public void ValidateCanDeleteMatch_Scheduled_DoesNotThrow()
        {
            var match = ScheduledMatch();

            var ex = Record.Exception(() => MatchControllerValidator.ValidateCanDeleteMatch(match));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData(MatchStatus.Ready)]
        [InlineData(MatchStatus.InProgress)]
        [InlineData(MatchStatus.Completed)]
        public void ValidateCanDeleteMatch_NotScheduled_Throws(MatchStatus status)
        {
            var match = ScheduledMatch();
            match.data.status = status;

            var ex = Assert.Throws<ValidationException>(() => MatchControllerValidator.ValidateCanDeleteMatch(match));
            Assert.Equal("Unable to delete a Match that is not Scheduled", ex.Message);
        }

        private static Match InProgressMatch()
        {
            var match = ScheduledMatch();
            match.data.status = MatchStatus.InProgress;
            return match;
        }

        [Fact]
        public void ValidateOppositionHeadcountEligible_MatchInProgress_DoesNotThrow()
        {
            var validator = new MatchControllerValidator(InProgressMatch(), null!);

            var ex = Record.Exception(() => validator.ValidateOppositionHeadcountEligible());

            Assert.Null(ex);
        }

        [Theory]
        [InlineData(MatchStatus.Scheduled)]
        [InlineData(MatchStatus.Ready)]
        [InlineData(MatchStatus.Completed)]
        public void ValidateOppositionHeadcountEligible_MatchNotInProgress_Throws(MatchStatus status)
        {
            var match = InProgressMatch();
            match.data.status = status;
            var validator = new MatchControllerValidator(match, null!);

            var ex = Assert.Throws<ValidationException>(() => validator.ValidateOppositionHeadcountEligible());
            Assert.Equal("Unable to record opposition headcount for a match that is not InProgress", ex.Message);
        }
    }
}
