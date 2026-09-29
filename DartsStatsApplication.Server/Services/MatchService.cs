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

    /// <summary>
    /// The Game-document writes MatchService.ReconcileOppositionHeadcount
    /// worked out in memory - left for the caller to store/delete, so the
    /// decision itself stays unit-testable without a document session.
    /// </summary>
    public class HeadcountReconciliation
    {
        public List<Game> GamesToStore { get; } = new();
        public Game? GameToDelete { get; set; }
    }

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
            _documentSession.Store<Game>(BuildGame(type, gameOrder, legsToPlay, startingScore, maxRounds));
        }

        private Game BuildGame(GameType type, int gameOrder, int legsToPlay, int startingScore, int? maxRounds)
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

            return game;
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
        /// What's currently applied to the match's Singles games off the back
        /// of an earlier headcount: a forfeited Singles game says which way
        /// the walkover went, and with none forfeited but headcountResolved
        /// still set, the last Singles game was voided (deleted) instead.
        /// </summary>
        public static HeadcountForfeitOutcome CurrentHeadcountOutcome(IEnumerable<Game> singlesGames, bool headcountResolved)
        {
            var forfeited = singlesGames.FirstOrDefault(g => g.data.forfeited);
            if (forfeited != null)
            {
                return forfeited.data.result == GameResult.Win ? HeadcountForfeitOutcome.WeWin : HeadcountForfeitOutcome.WeLose;
            }

            return headcountResolved ? HeadcountForfeitOutcome.Void : HeadcountForfeitOutcome.None;
        }

        /// <summary>
        /// Moves the match's Singles games (and score) from whatever headcount
        /// outcome is currently applied to the desired one, entirely in
        /// memory: first undoing the old outcome - a walkover goes back to a
        /// Pending, unforfeited game with its point taken back off the score;
        /// a voided game is recreated via createReplacementSingles - then
        /// applying the new one to whichever Singles game is now last. So
        /// unticking "Opposition only has 5 players" (or our own roster
        /// changing) on a re-Proceed fully reverses the earlier forfeit.
        /// Throws if the new outcome would forfeit/void a game that's
        /// already been started.
        /// </summary>
        public static HeadcountReconciliation ReconcileOppositionHeadcount(
            MatchData match,
            List<Game> singlesGames,
            HeadcountForfeitOutcome desired,
            Func<Game> createReplacementSingles)
        {
            var result = new HeadcountReconciliation();
            var current = CurrentHeadcountOutcome(singlesGames, match.oppositionHeadcountResolved);
            if (current == desired) return result;

            var singles = new List<Game>(singlesGames);

            if (current == HeadcountForfeitOutcome.WeWin || current == HeadcountForfeitOutcome.WeLose)
            {
                var forfeited = singles.First(g => g.data.forfeited);
                forfeited.data.status = GameStatus.Pending;
                forfeited.data.result = null;
                forfeited.data.forfeited = false;
                result.GamesToStore.Add(forfeited);

                if (current == HeadcountForfeitOutcome.WeWin)
                {
                    match.gamesFor = Math.Max(0, match.gamesFor - 1);
                }
                else
                {
                    match.gamesAgainst = Math.Max(0, match.gamesAgainst - 1);
                }
            }
            else if (current == HeadcountForfeitOutcome.Void)
            {
                var replacement = createReplacementSingles();
                singles.Add(replacement);
                result.GamesToStore.Add(replacement);
            }

            match.oppositionHeadcountResolved = false;
            if (desired == HeadcountForfeitOutcome.None) return result;

            var lastSingles = singles.OrderByDescending(g => g.data.order).FirstOrDefault();
            if (lastSingles == null) return result;

            if (lastSingles.data.status == GameStatus.InProgress || lastSingles.data.status == GameStatus.Complete)
            {
                throw new ValidationException("Unable to change the opposition headcount - the last Singles game has already been played");
            }

            match.oppositionHeadcountResolved = true;

            if (desired == HeadcountForfeitOutcome.Void)
            {
                // Both teams short a player - this game simply isn't played.
                result.GamesToStore.Remove(lastSingles);
                result.GameToDelete = lastSingles;
                return result;
            }

            // Exactly one side is short - the team with a full 6 is awarded
            // the game as a walkover.
            bool weWin = desired == HeadcountForfeitOutcome.WeWin;
            lastSingles.data.status = GameStatus.Complete;
            lastSingles.data.result = weWin ? GameResult.Win : GameResult.Loss;
            lastSingles.data.forfeited = true;
            if (!result.GamesToStore.Contains(lastSingles)) result.GamesToStore.Add(lastSingles);

            if (weWin)
            {
                match.gamesFor++;
            }
            else
            {
                match.gamesAgainst++;
            }

            return result;
        }

        /// <summary>
        /// Records whether the opposition also arrived short a player, and
        /// resolves the match's last Singles game accordingly against our
        /// own already-known headcount (_match.data.availablePlayers.Count,
        /// saved just before this is called - see AvailablePlayersControl.
        /// vue's proceed()). See ResolveOppositionHeadcountOutcome for the
        /// actual win/loss/void decision, and ReconcileOppositionHeadcount
        /// for how a re-Proceed (e.g. after "Back to Players", having
        /// ticked/unticked the box) undoes whatever an earlier call applied
        /// before applying the new outcome.
        /// </summary>
        public async Task RecordOppositionHeadcount(bool oppositionShortHanded)
        {
            _validator.ValidateOppositionHeadcountEligible();

            _match.data.oppositionShortHanded = oppositionShortHanded;

            var desired = ResolveOppositionHeadcountOutcome(_match.data.availablePlayers?.Count ?? 0, oppositionShortHanded);

            var games = (await _documentSession.Query<Game>()
                .Where(g => g.data.matchId == _match.Id)
                .ToListAsync()).ToList();
            var singlesGames = games.Where(g => g.data.type == GameType.Singles).ToList();

            // Only needed to undo a void - built up front since resolving the
            // League is async, while ReconcileOppositionHeadcount stays pure.
            Game? replacementSingles = null;
            if (CurrentHeadcountOutcome(singlesGames, _match.data.oppositionHeadcountResolved) == HeadcountForfeitOutcome.Void
                && desired != HeadcountForfeitOutcome.Void)
            {
                var league = await ResolveLeague();
                var (singlesLegs, singlesScore) = ResolveLegConfig(GameType.Singles, league);
                int nextOrder = games.Count == 0 ? 0 : games.Max(g => g.data.order) + 1;
                replacementSingles = BuildGame(GameType.Singles, nextOrder, singlesLegs, singlesScore, league?.data.maxRounds);
            }

            var reconciliation = ReconcileOppositionHeadcount(_match.data, singlesGames, desired,
                () => replacementSingles ?? throw new InvalidOperationException("Replacement Singles game was not prepared"));

            foreach (var game in reconciliation.GamesToStore)
            {
                _documentSession.Store(game);
            }
            if (reconciliation.GameToDelete != null)
            {
                _documentSession.Delete<Game>(reconciliation.GameToDelete.Id);
            }
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
