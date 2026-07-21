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
        private static Game CreateGame(GameType type, GameStatus status, List<Guid> playerIds, int? legsToPlay = null)
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
                    order = 0,
                    // Matches the historical hardcoded defaults (Singles best-of-3,
                    // Doubles/Trebles single-leg) unless a test overrides it -
                    // IsValidToCompleteGame's majority math now reads this directly.
                    legsToPlay = legsToPlay ?? (type == GameType.Singles ? 3 : 1),
                    startingScore = 501,
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
        public void IsValidToCompleteGame_SinglesDecidedTwoNilWithOnlyTwoLegsCreated_DoesNotThrow()
        {
            // A best-of-3 Singles game won 2-0: legs are created one at a time
            // as needed (GameService.CreateNextLeg), so a 3rd leg was never
            // created at all here - only 2 Leg documents exist, fewer than
            // legsToPlay(3), but the outcome can no longer change either way,
            // so the game should still be completable.
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Win),
            };

            var exception = Record.Exception(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCompleteGame_SinglesOneAllWithOnlyTwoLegsCreated_Throws()
        {
            // 1-1 with only 2 of a best-of-3's legs created (the 3rd hasn't
            // been created yet - GameService.CreateNextLeg only makes it once
            // the client asks for it) is not decided; legs.Count(2) alone must
            // not be mistaken for "all legs played" just because every Leg
            // document that happens to exist right now is Completed.
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1));
            var validator = new GameControllerValidator(game, null!);
            var legs = new List<Leg>
            {
                MakeLeg(LegStatus.Completed, LegResult.Win),
                MakeLeg(LegStatus.Completed, LegResult.Loss),
            };

            Assert.Throws<ValidationException>(() =>
                validator.IsValidToCompleteGame(legs, new CompleteGameData { result = GameResult.Win }));
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

        // ---- IsValidToCreateNextLeg ----

        [Theory]
        [InlineData(GameStatus.Pending)]
        [InlineData(GameStatus.Ready)]
        [InlineData(GameStatus.Complete)]
        public void IsValidToCreateNextLeg_StatusNotInProgress_Throws(GameStatus status)
        {
            var game = CreateGame(GameType.Singles, status, Players(1));
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCreateNextLeg(existingLegCount: 0));
        }

        [Fact]
        public void IsValidToCreateNextLeg_FewerLegsThanConfigured_DoesNotThrow()
        {
            // Best-of-3 Singles, only 1 leg created so far - room for more.
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1), legsToPlay: 3);
            var validator = new GameControllerValidator(game, null!);

            var exception = Record.Exception(() => validator.IsValidToCreateNextLeg(existingLegCount: 1));

            Assert.Null(exception);
        }

        [Fact]
        public void IsValidToCreateNextLeg_AlreadyReachedLegsToPlay_Throws()
        {
            var game = CreateGame(GameType.Singles, GameStatus.InProgress, Players(1), legsToPlay: 3);
            var validator = new GameControllerValidator(game, null!);

            var ex = Assert.Throws<ValidationException>(() => validator.IsValidToCreateNextLeg(existingLegCount: 3));
            Assert.Contains("already reached", ex.Message);
        }

        [Fact]
        public void IsValidToCreateNextLeg_SingleLegGameWithOneAlreadyCreated_Throws()
        {
            // Doubles/Trebles are single-leg (legsToPlay = 1) - a second leg is
            // never valid for them.
            var game = CreateGame(GameType.Doubles, GameStatus.InProgress, Players(2), legsToPlay: 1);
            var validator = new GameControllerValidator(game, null!);

            Assert.Throws<ValidationException>(() => validator.IsValidToCreateNextLeg(existingLegCount: 1));
        }
    }
}
