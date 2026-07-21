using DartsStatsApplication.Server.Controllers.Models;
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

        public void StartGame(Boolean wonBull)
        {
            _validator.IsValidToStartGame();
            _game.data.wonBull = wonBull;
            _game.data.status = GameStatus.InProgress;
            CreatePendingLegs();
            _documentSession.Store(_game);
        }

        public async Task CompleteGame(CompleteGameData data)
        {
            // Load the game's legs so the validator can stay a pure function over them.
            var legs = (await _documentSession.Query<Leg>()
                .Where(l => l.data.gameID == _game.Id)
                .ToListAsync()).ToList();

            _validator.IsValidToCompleteGame(legs, data);
            _game.data.status = GameStatus.Complete;
            _game.data.result = data.result;
            _documentSession.Store(_game);
        }

        private void CreatePendingLegs()
        {
            int legsToCreate = _game.data.legsToPlay;
            int startingScore = _game.data.startingScore;

            // Compat guard: Marten has no migrations, so a Game document persisted
            // before League config existed deserializes legsToPlay/startingScore at
            // C#'s int default of 0 (missing JSON properties). Treat that as "not
            // populated" and fall back to the same hardcoded values this always used
            // - and write them back onto the game itself (not just use them locally),
            // so legsToPlay/startingScore are guaranteed correct on every game by the
            // time it reaches InProgress, which the client's early-completion logic
            // depends on.
            if (legsToCreate <= 0 || startingScore <= 0)
            {
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
                _game.data.legsToPlay = legsToCreate;
                _game.data.startingScore = startingScore;
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
