using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public class GameControllerValidator
    {
        private Game _game;
        private readonly IDocumentSession _documentSession;

        public GameControllerValidator(Game game, IDocumentSession documentSession)
        {
            _game = game;
            _documentSession = documentSession;
        }

        /// <summary>
        /// Number of players required for the game's type.
        /// </summary>
        private int RequiredPlayers()
        {
            return _game.data.type switch
            {
                GameType.Singles => 1,
                GameType.Doubles => 2,
                GameType.Trebles => 3,
                _ => throw new Exception("Invalid Game Type")
            };
        }

        /// <summary>
        /// Validate that a game can be completed. Throws on any rule violation.
        /// The game's legs are passed in (loaded by the caller) so this rule stays a
        /// pure function over in-memory data and can be unit tested without a session.
        /// </summary>
        public void IsValidToCompleteGame(List<Leg> legs, CompleteGameData data)
        {
            // The game must be in progress to be completed.
            if (_game.data.status != GameStatus.InProgress)
            {
                throw new Exception("Unable to complete a Game that is not In Progress");
            }

            // There must be legs, and every one of them must be completed.
            if (legs == null || legs.Count == 0)
            {
                throw new Exception("Unable to complete a Game that has no Legs");
            }

            if (legs.Any(l => l.data.status != LegStatus.Completed))
            {
                throw new Exception("Unable to complete a Game while it has Legs that are not Completed");
            }

            // The submitted result must match the leg majority.
            // Singles is best-of-3 (more leg wins than losses -> game Win); Doubles/Trebles
            // are a single leg (that leg's result -> game result). Both collapse to wins > losses.
            int legWins = legs.Count(l => l.data.result == LegResult.Win);
            int legLosses = legs.Count(l => l.data.result == LegResult.Loss);
            GameResult expectedResult = legWins > legLosses ? GameResult.Win : GameResult.Loss;

            if (data.result != expectedResult)
            {
                throw new Exception(
                    $"Game result '{data.result}' does not match the Leg outcomes (Wins: {legWins}, Losses: {legLosses})");
            }
        }

        /// <summary>
        /// Validate that a game can be started. Throws on any rule violation.
        /// </summary>
        public void IsValidToStartGame()
        {
            // Players must already have been selected (which moves the game to Ready).
            if (_game.data.status != GameStatus.Ready)
            {
                throw new Exception("Unable to start a Game that is not Ready");
            }

            // Re-check the correct number of players is assigned for the game type.
            int requiredPlayers = RequiredPlayers();
            if (_game.data.playerIds == null || _game.data.playerIds.Count != requiredPlayers)
            {
                throw new Exception(
                    $"Invalid number of players for a {_game.data.type} game. Required: {requiredPlayers}");
            }
        }

        public void ValidateSelectedPlayers()
        {
            //Is the game in the correct status to update player selection
            if (_game.data.status != GameStatus.Pending)
            {
                throw new Exception("Unable to add players to a Game that is not Pending");
            }

            //Has the player been added to a game of the same type within the match (where 6+ players are available)


            //Is there enough players selected for the game type
            int requiredPlayers = RequiredPlayers();

            if(_game.data.playerIds.Count != requiredPlayers)
            {
                throw new Exception("Invalid number of players selected for a {_game.data.type} game. Required: {requiredPlayers}");
            }

        }

    }
}
