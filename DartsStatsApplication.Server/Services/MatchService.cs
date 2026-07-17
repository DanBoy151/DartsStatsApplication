using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;

namespace DartsStatsApplication.Server.Services
{
    public class MatchService
    {
        private IDocumentSession _documentSession;
        private Match _match;
        private MatchControllerValidator _validator;

        public MatchService(IDocumentSession session, Match match) { 
            _documentSession = session;
            _match = match;
            _validator = new MatchControllerValidator(_match, _documentSession);
        }

        public async Task StartMatch()
        {
            await _validator.IsValidToStartMatch();
            //Update the status of the match to In Progress
            _match.data.status = MatchStatus.Ready;
            _documentSession.Store<Match>(_match);

            //Create Pending Games for the Match
            CreatePendingGames();
        }

        private void CreateGame(GameType type, int gameOrder)
        {
            Game game = new Game();
            game.Id = Guid.NewGuid();
            game.data = new GameData();
            game.data.type = type;
            game.data.matchId = _match.Id;
            game.data.status = GameStatus.Pending;
            game.data.order = gameOrder;

            _documentSession.Store<Game>(game);
        }

        private void CreatePendingGames()
        {
            int gameOrder = 0;
            //Create Blank Trebles Games that match the leagues config
            int count = 0;
            while (count < 2)
            {
                CreateGame(GameType.Trebles, gameOrder);
                count++;
                gameOrder++;
            }
            //Create Blank Doubles Games that match the leagues config
            count = 0;
            while (count < 3)
            {
                CreateGame(GameType.Doubles, gameOrder);
                count++;
                gameOrder++;
            }
            //Create Blank Singles Games that match the leagues config
            count = 0;
            while (count < 6)
            {
                CreateGame(GameType.Singles, gameOrder);
                count++;
                gameOrder++;
            }
        }

        public async Task UpdateAvailablePlayers(List<Guid> availablePlayers)
        {
            _match.data.availablePlayers = availablePlayers;

            await _validator.ValidateAvailablePlayers();
            _match.data.status = MatchStatus.InProgress;
            _documentSession.Store(_match);
        }


        public void UpdateMatchScore(Boolean result)
        {
            if (result == true)
            {
                _match.data.gamesFor++;
            }
            else
            {
                _match.data.gamesAgainst++;
            }

                _documentSession.Store(_match);
        }

        /// <summary>
        /// Complete the match: marks it Completed, records the player of the match, and
        /// validates via MatchControllerValidator (the match's games are loaded here so the
        /// validator can stay a pure function over them). Throws ValidationException if the
        /// match isn't eligible to be completed yet.
        /// </summary>
        public void CompleteMatch(Guid playerOfMatch)
        {
            _match.data.status = MatchStatus.Completed;
            _match.data.playerOfMatch = playerOfMatch;

            var games = _documentSession.Query<Game>()
                .Where(g => g.data.matchId == _match.Id)
                .ToList();

            string err = _validator.IsValidToCompleteMatch(games);
            if (err != string.Empty)
            {
                throw new ValidationException(err);
            }

            _documentSession.Store(_match);
        }
    }
}
