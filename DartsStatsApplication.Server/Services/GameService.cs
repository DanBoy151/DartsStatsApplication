using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;

namespace DartsStatsApplication.Server.Services
{
    public class GameService
    {
        private IDocumentSession _documentSession;
        private Game _game;
        private GameControllerValidator _validator;

        public GameService(IDocumentSession session, Game game)
        {
            _documentSession = session;
            _game = game;
            _validator = new GameControllerValidator(_game, _documentSession);
        }

        public void UpdateAvailablePlayers(List<Guid> selectedPlayers)
        {
            _game.data.playerIds = selectedPlayers;

            _validator.ValidateSelectedPlayers();
            _game.data.status = GameStatus.Ready;
            _documentSession.Store(_game);
        }

    }
}
