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

        public void IsValidToCompleteGame()
        {

        }

        public void IsValidToStartGame()
        {

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
            int requiredPlayers = _game.data.type switch
            {
                GameType.Singles => 1,
                GameType.Doubles => 2,
                GameType.Trebles => 3,
                _ => throw new Exception("Invalid Game Type")
            };

            if(_game.data.playerIds.Count != requiredPlayers)
            {
                throw new Exception("Invalid number of players selected for a {_game.data.type} game. Required: {requiredPlayers}");
            }

        }

    }
}
