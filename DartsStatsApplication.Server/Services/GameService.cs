using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;
using Microsoft.CodeAnalysis.CSharp.Syntax;

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

        public void StartGame(Boolean wonBull)
        {
            _validator.IsValidToStartGame();
            _game.data.wonBull = wonBull;
            _game.data.status = GameStatus.InProgress;
            CreatePendingLegs();
            _documentSession.Store(_game);
        }

        private void CreatePendingLegs()
        {
            int legsToCreate = 0;
            int startingScore = 0;
            switch (_game.data.type)
            {
                case GameType.Singles:
                    legsToCreate = 3;
                    startingScore = 501;
                    break;
                case GameType.Doubles:
                    legsToCreate = 1;
                    startingScore = 601;
                    break;
                case GameType.Trebles:
                    legsToCreate = 1;
                    startingScore = 701;
                    break; 
            }
            int count = 0;
            while (count < legsToCreate)
            {
                CreateLegs(count, startingScore);
                count++;
            }
        }

        private void CreateLegs(int count, int startingScore)
        {
            Leg leg = new Leg();
            leg.Id = Guid.NewGuid();
            leg.data = new LegData();
            leg.data.gameID = _game.Id;
            leg.data.status = LegStatus.Pending;
            leg.data.order = count;
            leg.data.remainingScore = startingScore;

            _documentSession.Store<Leg>(leg);
        }


    }
}
