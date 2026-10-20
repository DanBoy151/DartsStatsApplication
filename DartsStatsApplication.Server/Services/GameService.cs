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

        /// <summary>
        /// playMode is the late-night choice (see GameData.lateCutoverTime), or
        /// null when the game is started before the cutover. ThrowForBull
        /// completes the game on the spot - wonBull is then the bull throw
        /// that decides it, and no legs are ever created - while SingleLeg
        /// plays the game as a one-leg decider instead of its configured legs.
        /// </summary>
        public void StartGame(Boolean wonBull, GamePlayMode? playMode = null)
        {
            _validator.IsValidToStartGame();
            _validator.IsValidPlayMode(playMode);
            _game.data.wonBull = wonBull;
            _game.data.playMode = playMode;

            if (playMode == GamePlayMode.ThrowForBull)
            {
                _game.data.status = GameStatus.Complete;
                _game.data.result = wonBull ? GameResult.Win : GameResult.Loss;
                _documentSession.Store(_game);
                return;
            }

            _game.data.status = GameStatus.InProgress;
            ResolveLegConfigCompat();
            if (playMode == GamePlayMode.SingleLeg)
            {
                _game.data.legsToPlay = 1;
            }

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

            if (data.throwForBull)
            {
                // Decided by the bull instead of the legs, so the leg majority
                // is deliberately not checked against the submitted result.
                _validator.IsValidToCompleteGameByBull();
                _game.data.playMode = GamePlayMode.ThrowForBull;
            }
            else
            {
                _validator.IsValidToCompleteGame(legs, data);
            }
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
