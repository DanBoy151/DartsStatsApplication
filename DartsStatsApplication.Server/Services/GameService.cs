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

        public async Task UpdateAvailablePlayers(List<Guid> selectedPlayers)
        {
            _game.data.playerIds = selectedPlayers;

            var match = await _documentSession.LoadAsync<Match>(_game.data.matchId);
            var gamesOfSameType = (await _documentSession.Query<Game>()
                .Where(g => g.data.matchId == _game.data.matchId && g.data.type == _game.data.type)
                .ToListAsync()).ToList();

            _validator.ValidateSelectedPlayers(gamesOfSameType, match?.data.availablePlayers?.Count);
            _game.data.status = GameStatus.Ready;
            _documentSession.Store(_game);
        }

        public void StartGame(Boolean wonBull)
        {
            _validator.IsValidToStartGame();
            _game.data.wonBull = wonBull;
            _game.data.status = GameStatus.InProgress;
            ResolveLegConfigCompat();

            // Only the first leg is created here - further legs are created one
            // at a time, on demand, via CreateNextLeg() as the game actually
            // needs them, so a game decided early (e.g. 2-0 in a best-of-3)
            // never leaves an unused Leg document behind for the leg(s) that
            // were never played.
            var firstLeg = BuildLeg(order: 0, startingScore: _game.data.startingScore);
            _documentSession.Store(firstLeg);
            _documentSession.Store(_game);
        }

        /// <summary>
        /// Awards this game as a walkover, bypassing the normal completion
        /// path entirely - IsValidToCompleteGame requires InProgress status
        /// and at least one Leg, neither of which applies to a game nobody
        /// ever played (see MatchService.RecordOppositionHeadcount, the only
        /// caller). Sets forfeited so the UI can label it distinctly from a
        /// normally-played result.
        /// </summary>
        public void ForfeitGame(GameResult result)
        {
            _game.data.status = GameStatus.Complete;
            _game.data.result = result;
            _game.data.forfeited = true;
            _documentSession.Store(_game);
        }

        /// <summary>
        /// Corrects the recorded bull-off result after the fact - a factual
        /// correction rather than a game-state transition, so (unlike
        /// StartGame) this has no status precondition; it can be changed at
        /// any time, including after the game is Complete.
        /// </summary>
        public void UpdateWonBull(Boolean wonBull)
        {
            _game.data.wonBull = wonBull;
            _documentSession.Store(_game);
        }

        /// <summary>
        /// Creates the next Leg for this game (order = however many already
        /// exist), as long as the game is In Progress and hasn't already
        /// reached its configured legsToPlay. Called by the client once it
        /// determines (via gameProgress.ts's isGameDecided) that another leg
        /// is actually needed, rather than every leg being pre-created upfront.
        /// </summary>
        public async Task<Leg> CreateNextLeg()
        {
            var existingLegs = (await _documentSession.Query<Leg>()
                .Where(l => l.data.gameID == _game.Id)
                .ToListAsync()).ToList();

            _validator.IsValidToCreateNextLeg(existingLegs.Count);

            var leg = BuildLeg(order: existingLegs.Count, startingScore: _game.data.startingScore);
            _documentSession.Store(leg);
            return leg;
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

        /// <summary>
        /// Compat guard: Marten has no migrations, so a Game document persisted
        /// before League config existed deserializes legsToPlay/startingScore at
        /// C#'s int default of 0 (missing JSON properties). Treat that as "not
        /// populated" and fall back to the same hardcoded values this always used
        /// - and write them back onto the game itself (not just use them locally)
        /// - so legsToPlay/startingScore are guaranteed correct by the time the
        /// game reaches InProgress, which both CreateNextLeg() and the client's
        /// early-completion logic depend on.
        /// </summary>
        private void ResolveLegConfigCompat()
        {
            if (_game.data.legsToPlay <= 0 || _game.data.startingScore <= 0)
            {
                switch (_game.data.type)
                {
                    case GameType.Singles:
                        _game.data.legsToPlay = 3;
                        _game.data.startingScore = 501;
                        break;
                    case GameType.Doubles:
                        _game.data.legsToPlay = 1;
                        _game.data.startingScore = 601;
                        break;
                    case GameType.Trebles:
                        _game.data.legsToPlay = 1;
                        _game.data.startingScore = 701;
                        break;
                }
            }
        }

        private Leg BuildLeg(int order, int startingScore)
        {
            Leg leg = new Leg();
            leg.Id = Guid.NewGuid();
            leg.data = new LegData();
            leg.data.gameID = _game.Id;
            leg.data.status = LegStatus.Pending;
            leg.data.order = order;
            leg.data.remainingScore = startingScore;
            return leg;
        }
    }
}
