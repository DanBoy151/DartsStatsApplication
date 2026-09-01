using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;

namespace DartsStatsApplication.Server.Services
{
    /// <summary>
    /// The four possible outcomes of MatchService.ResolveOppositionHeadcountOutcome.
    /// </summary>
    public enum HeadcountForfeitOutcome { None, WeWin, WeLose, Void }

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
            _match.data.startTime = DateTime.UtcNow;
            _documentSession.Store<Match>(_match);

            // Resolve the league (if any) BEFORE creating games, so every game
            // created for this match gets its own immutable snapshot of the
            // config that was actually in force when it was played.
            var league = await ResolveLeague();
            CreatePendingGames(league);
        }

        /// <summary>
        /// Loads this match's League via its Season, or null if the match has no
        /// season (today's hardcoded defaults apply instead - see
        /// ResolveLegConfig). A seasonId that points at a missing Season/League
        /// is a data-integrity bug, not a legitimate "no season" case, so both
        /// throw rather than silently falling back.
        /// </summary>
        private async Task<League?> ResolveLeague()
        {
            if (_match.data.seasonId == null) return null;

            var season = await _documentSession.LoadAsync<Season>(_match.data.seasonId.Value);
            if (season == null)
            {
                throw new ValidationException("Match's Season no longer exists");
            }

            var league = await _documentSession.LoadAsync<League>(season.data.leagueId);
            if (league == null)
            {
                throw new ValidationException("Season's League no longer exists");
            }

            return league;
        }

        /// <summary>
        /// Today's hardcoded defaults (3 legs/501, 1 leg/601, 1 leg/701) when there's
        /// no league; otherwise the league's configured values for this game type.
        /// </summary>
        private static (int legsToPlay, int startingScore) ResolveLegConfig(GameType type, League? league)
        {
            if (league == null)
            {
                return type switch
                {
                    GameType.Singles => (3, 501),
                    GameType.Doubles => (1, 601),
                    GameType.Trebles => (1, 701),
                    _ => (1, 501),
                };
            }

            return type switch
            {
                GameType.Singles => (league.data.singlesLegs, league.data.singlesStartScore),
                GameType.Doubles => (league.data.doublesLegs, league.data.doublesStartScore),
                GameType.Trebles => (league.data.treblesLegs, league.data.treblesStartScore),
                _ => (1, 501),
            };
        }

        private void CreateGame(GameType type, int gameOrder, int legsToPlay, int startingScore, int? maxRounds)
        {
            Game game = new Game();
            game.Id = Guid.NewGuid();
            game.data = new GameData();
            game.data.type = type;
            game.data.matchId = _match.Id;
            game.data.status = GameStatus.Pending;
            game.data.order = gameOrder;
            game.data.legsToPlay = legsToPlay;
            game.data.startingScore = startingScore;
            game.data.maxRounds = maxRounds;

            _documentSession.Store<Game>(game);
        }

        private void CreatePendingGames(League? league)
        {
            int gameOrder = 0;
            int numTrebles = league?.data.numTrebles ?? 2;
            int numDoubles = league?.data.numDoubles ?? 3;
            int numSingles = league?.data.numSingles ?? 6;

            //Create Blank Trebles Games that match the league's config
            var (treblesLegs, treblesScore) = ResolveLegConfig(GameType.Trebles, league);
            int count = 0;
            while (count < numTrebles)
            {
                CreateGame(GameType.Trebles, gameOrder, treblesLegs, treblesScore, league?.data.maxRounds);
                count++;
                gameOrder++;
            }
            //Create Blank Doubles Games that match the league's config
            var (doublesLegs, doublesScore) = ResolveLegConfig(GameType.Doubles, league);
            count = 0;
            while (count < numDoubles)
            {
                CreateGame(GameType.Doubles, gameOrder, doublesLegs, doublesScore, league?.data.maxRounds);
                count++;
                gameOrder++;
            }
            //Create Blank Singles Games that match the league's config
            var (singlesLegs, singlesScore) = ResolveLegConfig(GameType.Singles, league);
            count = 0;
            while (count < numSingles)
            {
                CreateGame(GameType.Singles, gameOrder, singlesLegs, singlesScore, league?.data.maxRounds);
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


        /// <summary>
        /// Pure decision over the two known headcounts - no side effects, so
        /// this is unit-testable without a document session (see
        /// MatchServiceTests). Kept separate from RecordOppositionHeadcount()
        /// itself, which performs the actual Game-document mutation this
        /// outcome implies.
        /// </summary>
        public static HeadcountForfeitOutcome ResolveOppositionHeadcountOutcome(int ourAvailableCount, bool oppositionShortHanded)
        {
            bool ourTeamShort = ourAvailableCount == 5;

            if (!ourTeamShort && !oppositionShortHanded) return HeadcountForfeitOutcome.None;
            if (ourTeamShort && oppositionShortHanded) return HeadcountForfeitOutcome.Void;
            return ourTeamShort ? HeadcountForfeitOutcome.WeLose : HeadcountForfeitOutcome.WeWin;
        }

        /// <summary>
        /// Records whether the opposition also arrived short a player, and
        /// resolves the match's last Singles game accordingly against our
        /// own already-known headcount (_match.data.availablePlayers.Count,
        /// saved just before this is called - see AvailablePlayersControl.
        /// vue's proceed()). See ResolveOppositionHeadcountOutcome for the
        /// actual win/loss/void decision.
        /// oppositionShortHanded itself is always overwritten with the
        /// latest call's value - a re-Proceed (e.g. after "Back to Players",
        /// having ticked/unticked the box the first time round) needs to
        /// actually take effect. Only oppositionHeadcountResolved guards
        /// against re-running: once a Game has genuinely been
        /// forfeited/deleted off the back of this, it's left alone rather
        /// than risking a second mutation against a possibly-different Game.
        /// </summary>
        public async Task RecordOppositionHeadcount(bool oppositionShortHanded)
        {
            _validator.ValidateOppositionHeadcountEligible();

            if (_match.data.oppositionHeadcountResolved)
            {
                return;
            }

            _match.data.oppositionShortHanded = oppositionShortHanded;

            var outcome = ResolveOppositionHeadcountOutcome(_match.data.availablePlayers?.Count ?? 0, oppositionShortHanded);
            if (outcome == HeadcountForfeitOutcome.None)
            {
                _documentSession.Store(_match);
                return;
            }

            _match.data.oppositionHeadcountResolved = true;
            _documentSession.Store(_match);

            var singlesGames = (await _documentSession.Query<Game>()
                .Where(g => g.data.matchId == _match.Id && g.data.type == GameType.Singles)
                .ToListAsync()).ToList();

            if (singlesGames.Count == 0) return;

            var lastSingles = singlesGames.OrderByDescending(g => g.data.order).First();

            if (outcome == HeadcountForfeitOutcome.Void)
            {
                // Both teams short a player - this game simply isn't played.
                _documentSession.Delete<Game>(lastSingles.Id);
                return;
            }

            // Exactly one side is short - the team with a full 6 is awarded
            // the game as a walkover.
            GameService gameService = new GameService(_documentSession, lastSingles);
            gameService.ForfeitGame(outcome == HeadcountForfeitOutcome.WeWin ? GameResult.Win : GameResult.Loss);
            UpdateMatchScore(outcome == HeadcountForfeitOutcome.WeWin);
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
        public async Task CompleteMatch(Guid playerOfMatch, MatchResult result)
        {
            _match.data.status = MatchStatus.Completed;
            _match.data.playerOfMatch = playerOfMatch;
            _match.data.result = result;
            _match.data.finishTime = DateTime.UtcNow;

            var games = (await _documentSession.Query<Game>()
                .Where(g => g.data.matchId == _match.Id)
                .ToListAsync()).ToList();

            string err = _validator.IsValidToCompleteMatch(games);
            if (err != string.Empty)
            {
                throw new ValidationException(err);
            }

            _documentSession.Store(_match);
        }
    }
}
