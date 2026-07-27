using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // GameControllerValidator.ValidateSelectedPlayers() never reads the
    // IDocumentSession passed into the constructor, so it's safe to pass a
    // null session in these tests. Do NOT copy this pattern for validator
    // methods that actually query the session (e.g.
    // MatchControllerValidator.IsValidToStartMatch / ValidateAvailablePlayers,
    // or GameControllerValidator.IsValidToStartGame / IsValidToCompleteGame
    // once they have real logic) -- those need a real Marten-backed session
    // and are intentionally not covered yet. See Stage 3 of the remediation
    // plan, where those tests should be written alongside the real
    // implementations rather than against stubs.
    public class GameControllerValidatorTests
    {
        private static Game CreateGame(GameType type, GameStatus status, List<Guid> playerIds, int order = 0, Guid? matchId = null)
        {
            return new Game
            {
                Id = Guid.NewGuid(),
                data = new GameData
                {
                    matchId = matchId ?? Guid.NewGuid(),
                    type = type,
                    status = status,
                    playerIds = playerIds,
                    wonBull = false,
                    order = order
                }
            };
        }

        private static List<Guid> Players(int count)
        {
            var players = new List<Guid>();
            for (int i = 0; i < count; i++)
            {
                players.Add(Guid.NewGuid());
            }
            return players;
        }

        [Fact]
        public void ValidateSelectedPlayers_SinglesWithOnePlayer_DoesNotThrow()
        {
            var game = CreateGame(GameType.Singles, GameStatus.Pending, Players(1));
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.ValidateSelectedPlayers());

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(2)]
        public void ValidateSelectedPlayers_SinglesWithWrongPlayerCount_Throws(int playerCount)
        {
            var game = CreateGame(GameType.Singles, GameStatus.Pending, Players(playerCount));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.ValidateSelectedPlayers());
        }

        [Fact]
        public void ValidateSelectedPlayers_DoublesWithTwoPlayers_DoesNotThrow()
        {
            var game = CreateGame(GameType.Doubles, GameStatus.Pending, Players(2));
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.ValidateSelectedPlayers());

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(3)]
        public void ValidateSelectedPlayers_DoublesWithWrongPlayerCount_Throws(int playerCount)
        {
            var game = CreateGame(GameType.Doubles, GameStatus.Pending, Players(playerCount));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.ValidateSelectedPlayers());
        }

        [Fact]
        public void ValidateSelectedPlayers_TreblesWithThreePlayers_DoesNotThrow()
        {
            var game = CreateGame(GameType.Trebles, GameStatus.Pending, Players(3));
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.ValidateSelectedPlayers());

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(2)]
        [InlineData(4)]
        public void ValidateSelectedPlayers_TreblesWithWrongPlayerCount_Throws(int playerCount)
        {
            var game = CreateGame(GameType.Trebles, GameStatus.Pending, Players(playerCount));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.ValidateSelectedPlayers());
        }

        [Fact]
        public void ValidateSelectedPlayers_StatusReady_WithValidPlayerCount_DoesNotThrow()
        {
            // A game that already has players assigned (Ready) can still have
            // them changed, as long as it hasn't actually started yet.
            var game = CreateGame(GameType.Singles, GameStatus.Ready, Players(1));
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.ValidateSelectedPlayers());

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(GameStatus.InProgress)]
        [InlineData(GameStatus.Complete)]
        public void ValidateSelectedPlayers_StatusInProgressOrComplete_ThrowsRegardlessOfPlayerCount(GameStatus status)
        {
            // Correct player count for Singles (1), but the game has already
            // started, so this should still throw -- status is checked before count.
            var game = CreateGame(GameType.Singles, status, Players(1));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.ValidateSelectedPlayers());
        }

        [Fact]
        public void ValidateSelectedPlayers_PlayerAlreadyUsedInAnotherGameOfSameType_Throws()
        {
            var matchId = Guid.NewGuid();
            var reusedPlayer = Guid.NewGuid();
            var otherSingles = CreateGame(GameType.Singles, GameStatus.Ready, new List<Guid> { reusedPlayer }, order: 5, matchId: matchId);
            var thisSingles = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid> { reusedPlayer }, order: 6, matchId: matchId);
            var validator = new GameControllerValidator(thisSingles, null!);

            var ex = Assert.Throws<ValidationException>(
                () => validator.ValidateSelectedPlayers(new List<Game> { otherSingles, thisSingles }, matchAvailablePlayerCount: 6));

            Assert.Contains("already assigned to another", ex.Message);
        }

        [Fact]
        public void ValidateSelectedPlayers_PlayerUsedInDifferentTypeGame_DoesNotThrow()
        {
            // gamesOfSameType is scoped by the caller to games sharing this
            // game's type - a player already used in e.g. a Doubles game
            // should never block a Singles selection.
            var matchId = Guid.NewGuid();
            var player = Guid.NewGuid();
            var doublesGame = CreateGame(GameType.Doubles, GameStatus.Ready, new List<Guid> { player, Guid.NewGuid() }, order: 2, matchId: matchId);
            var singlesGame = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid> { player }, order: 5, matchId: matchId);
            var validator = new GameControllerValidator(singlesGame, null!);

            // Caller only ever passes games of the SAME type, so doublesGame
            // wouldn't really be included here - passing just singlesGame
            // itself is the realistic "no same-type conflict" case.
            var exception = Record.Exception(
                () => validator.ValidateSelectedPlayers(new List<Game> { singlesGame }, matchAvailablePlayerCount: 6));

            Assert.Null(exception);
        }

        [Fact]
        public void ValidateSelectedPlayers_OnlyFivePlayersAvailable_ReuseAllowedOnlyForLastGameOfType()
        {
            var matchId = Guid.NewGuid();
            var reusedPlayer = Guid.NewGuid();
            var firstSingles = CreateGame(GameType.Singles, GameStatus.Ready, new List<Guid> { reusedPlayer }, order: 5, matchId: matchId);
            var lastSingles = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid> { reusedPlayer }, order: 10, matchId: matchId);
            var siblings = new List<Game> { firstSingles, lastSingles };

            var lastGameValidator = new GameControllerValidator(lastSingles, null!);
            var exception = Record.Exception(
                () => lastGameValidator.ValidateSelectedPlayers(siblings, matchAvailablePlayerCount: 5));

            Assert.Null(exception);
        }

        [Fact]
        public void ValidateSelectedPlayers_OnlyFivePlayersAvailable_ReuseStillRejectedForNonLastGameOfType()
        {
            var matchId = Guid.NewGuid();
            var reusedPlayer = Guid.NewGuid();
            var firstSingles = CreateGame(GameType.Singles, GameStatus.Ready, new List<Guid> { reusedPlayer }, order: 5, matchId: matchId);
            var middleSingles = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid> { reusedPlayer }, order: 7, matchId: matchId);
            var lastSingles = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid>(), order: 10, matchId: matchId);
            var siblings = new List<Game> { firstSingles, middleSingles, lastSingles };

            var middleGameValidator = new GameControllerValidator(middleSingles, null!);

            var ex = Assert.Throws<ValidationException>(
                () => middleGameValidator.ValidateSelectedPlayers(siblings, matchAvailablePlayerCount: 5));

            Assert.Contains("already assigned to another", ex.Message);
        }

        [Fact]
        public void ValidateSelectedPlayers_SixPlayersAvailable_ReuseRejectedEvenForLastGameOfType()
        {
            // The exception only applies when exactly 5 are available - with a
            // full 6, every game of a type should always be fillable without reuse.
            var matchId = Guid.NewGuid();
            var reusedPlayer = Guid.NewGuid();
            var firstSingles = CreateGame(GameType.Singles, GameStatus.Ready, new List<Guid> { reusedPlayer }, order: 5, matchId: matchId);
            var lastSingles = CreateGame(GameType.Singles, GameStatus.Pending, new List<Guid> { reusedPlayer }, order: 10, matchId: matchId);
            var siblings = new List<Game> { firstSingles, lastSingles };

            var lastGameValidator = new GameControllerValidator(lastSingles, null!);

            Assert.Throws<ValidationException>(
                () => lastGameValidator.ValidateSelectedPlayers(siblings, matchAvailablePlayerCount: 6));
        }
    }
}
