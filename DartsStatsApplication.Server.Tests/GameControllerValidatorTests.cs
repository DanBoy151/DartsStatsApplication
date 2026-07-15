using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
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
        private static Game CreateGame(GameType type, GameStatus status, List<Guid> playerIds)
        {
            return new Game
            {
                Id = Guid.NewGuid(),
                data = new GameData
                {
                    matchId = Guid.NewGuid(),
                    type = type,
                    status = status,
                    playerIds = playerIds,
                    wonBull = false,
                    order = 0
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

            Assert.Throws<Exception>(() => validator.ValidateSelectedPlayers());
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

            Assert.Throws<Exception>(() => validator.ValidateSelectedPlayers());
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

            Assert.Throws<Exception>(() => validator.ValidateSelectedPlayers());
        }

        [Theory]
        [InlineData(GameStatus.Ready)]
        [InlineData(GameStatus.InProgress)]
        [InlineData(GameStatus.Complete)]
        public void ValidateSelectedPlayers_StatusNotPending_ThrowsRegardlessOfPlayerCount(GameStatus status)
        {
            // Correct player count for Singles (1), but status isn't Pending,
            // so this should still throw -- status is checked before count.
            var game = CreateGame(GameType.Singles, status, Players(1));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<Exception>(() => validator.ValidateSelectedPlayers());
        }
    }
}
