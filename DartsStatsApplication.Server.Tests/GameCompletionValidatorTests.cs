using System;
using System.Collections.Generic;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // IsValidToStartGame reads only the Game; IsValidToCompleteGame reads the Game plus
    // the List<Leg> passed in. Neither touches the IDocumentSession, so a null session
    // is safe here (the caller does the leg query and passes the results in).
    public class GameCompletionValidatorTests
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
                    result = null,
                    order = 0
                }
            };
        }

        private static List<Guid> Players(int count)
        {
            var players = new List<Guid>();
            for (int i = 0; i < count; i++) players.Add(Guid.NewGuid());
            return players;
        }

        private static Leg MakeLeg(LegStatus status, LegResult? result)
        {
            return new Leg
            {
                Id = Guid.NewGuid(),
                data = new LegData
                {
                    gameID = Guid.NewGuid(),
                    status = status,
                    score = new List<PlayerScore>(),
                    result = result,
                    finishDarts = null,
                    order = 0,
                    remainingScore = 0
                }
            };
        }

        // ---- IsValidToStartGame ----

        [Fact]
        public void IsValidToStartGame_ReadyWithCorrectPlayerCount_DoesNotThrow()
        {
            var game = CreateGame(GameType.Doubles, GameStatus.Ready, Players(2));
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.IsValidToStartGame());

            Assert.Null(exception);
        }

        [Theory]
        [InlineData(GameStatus.Pending)]
        [InlineData(GameStatus.InProgress)]
        [InlineData(GameStatus.Complete)]
        public void IsValidToStartGame_StatusNotReady_Throws(GameStatus status)
        {
            var game = CreateGame(GameType.Singles, status, Players(1));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToStartGame());
        }

        [Fact]
        public void IsValidToStartGame_ReadyWithWrongPlayerCount_Throws()
        {
            var game = CreateGame(GameType.Trebles, GameStatus.Ready, Players(2)); // needs 3
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToStartGame());
        }

        // ---- IsValidToCompleteGame ----

        [Theory]
        [InlineData(GameStatus.Pending)]
        [InlineData(GameStatus.Ready)]
        [InlineData(GameStatus.Complete)]
        public void IsValidToCompleteGame_StatusNotInProgress_Throws(GameStatus status)
        {
            var game = CreateGame(GameType.Singles, status, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg> { MakeLeg(LegStatus.Completed, LegResult.Win) };

            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));
        }

        [Fact]
        public void IsValidToCompleteGame_NoLegs_Throws()
        {
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(new List<Leg>(), new CompleteGameData { result = GameResult.Win }));
        }

        [Fact]
        public void IsValidToCompleteGame_LegNotCompleted_Throws()
        {
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Started, null), // still in progress
                MakeLeg(LegStatus.Pending, null)
            };

            // 1-0 in a best-of-3 isn't decided yet, so the incomplete legs still matter.
            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));
        }

        [Fact]
        public void IsValidToCompleteGame_SinglesDecidedTwoNilWithPendingThirdLeg_DoesNotThrow()
        {
            // A best-of-3 Singles game won 2-0: the 3rd leg is still Pending
            // (never played) but the outcome can no longer change, so the game
            // should be completable without it.
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Pending, null)
            };

            var exception = Record.Exception(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteGame_SinglesOneAllWithThirdLegPending_Throws()
        {
            // 1-1 in a best-of-3 Singles game is not decided - the 3rd leg must be played.
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Loss),
                MakeLeg(LegStatus.Pending, null)
            };

            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));
        }

        [Fact]
        public void IsValidToCompleteGame_SinglesBestOfThreeWin_DoesNotThrow()
        {
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Loss),
                MakeLeg(LegStatus.Completed, LegResult.Win)
            };

            var exception = Record.Exception(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteGame_ResultContradictsLegMajority_Throws()
        {
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Loss),
                MakeLeg(LegStatus.Completed, LegResult.Win)
            };

            // Majority is Win, but the submitted result says Loss.
            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Loss }));
        }

        [Fact]
        public void IsValidToCompleteGame_SingleLegLoss_DoesNotThrow()
        {
            var game = CreateGame(GameType.Doubles, GameStatus.InProgress, Players(2));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg> { MakeLeg(LegStatus.Completed, LegResult.Loss) };

            var exception = Record.Exception(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Loss }));

            Assert.Null(exception);
        }
    }
}
