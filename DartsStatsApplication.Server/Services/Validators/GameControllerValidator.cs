using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;
using System.Linq;

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
                _ => throw new ValidationException("Invalid Game Type")
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
                throw new ValidationException("Unable to complete a Game that is not In Progress");
            }

            // There must be legs.
            if (legs == null || legs.Count == 0)
            {
                throw new ValidationException("Unable to complete a Game that has no Legs");
            }

            // Every leg must be completed, UNLESS the outcome is already
            // mathematically decided (a player has enough leg wins/losses that
            // any leg(s) still to come can no longer change the result - e.g. a
            // best-of-3 Singles game won/lost 2-0). Majority is computed from
            // the game's configured legsToPlay, not legs.Count/legs.Length -
            // legs are now created one at a time as they're actually needed
            // (see GameService.CreateNextLeg), so a game decided early
            // legitimately has fewer Leg documents than legsToPlay, and
            // legs.Count alone would understate what "majority" really means.
            int legWins = legs.Count(l => l.data.result == LegResult.Win);
            int legLosses = legs.Count(l => l.data.result == LegResult.Loss);
            int legsNeededToWin = (_game.data.legsToPlay + 1) / 2; // ceil(legsToPlay / 2)
            bool decided = legWins >= legsNeededToWin || legLosses >= legsNeededToWin;
            bool allLegsPlayed = legs.Count >= _game.data.legsToPlay && legs.All(l => l.data.status == LegStatus.Completed);

            if (!allLegsPlayed && !decided)
            {
                throw new ValidationException("Unable to complete a Game while it has Legs that are not Completed");
            }

            // The submitted result must match the leg majority.
            // Singles is best-of-3 (more leg wins than losses -> game Win); Doubles/Trebles
            // are a single leg (that leg's result -> game result). Both collapse to wins > losses.
            GameResult expectedResult = legWins > legLosses ? GameResult.Win : GameResult.Loss;

            if (data.result != expectedResult)
            {
                throw new ValidationException(
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
                throw new ValidationException("Unable to start a Game that is not Ready");
            }

            // Re-check the correct number of players is assigned for the game type.
            int requiredPlayers = RequiredPlayers();
            if (_game.data.playerIds == null || _game.data.playerIds.Count != requiredPlayers)
            {
                throw new ValidationException(
                    $"Invalid number of players for a {_game.data.type} game. Required: {requiredPlayers}");
            }
        }

        /// <summary>
        /// Validate that another Leg can be created for this game: it must be
        /// In Progress, and not already have as many Legs as its configured
        /// legsToPlay (the caller passes the count of Legs that already exist,
        /// loaded from the session, so this stays a pure function).
        /// </summary>
        public void IsValidToCreateNextLeg(int existingLegCount)
        {
            if (_game.data.status != GameStatus.InProgress)
            {
                throw new ValidationException("Unable to create a Leg for a Game that is not In Progress");
            }

            if (existingLegCount >= _game.data.legsToPlay)
            {
                throw new ValidationException("This Game has already reached its configured number of Legs");
            }
        }

        /// <summary>
        /// gamesOfSameType is every Game (including this one) sharing this game's
        /// matchId/type - passed in by the caller so this stays a pure function,
        /// same convention as IsValidToCompleteGame's legs. matchAvailablePlayerCount
        /// is the match's own already-recorded headcount. Both default to
        /// "unknown" (no siblings, no count) so existing callers/tests that only
        /// care about the status/count checks below don't need updating.
        /// </summary>
        public void ValidateSelectedPlayers(List<Game>? gamesOfSameType = null, int? matchAvailablePlayerCount = null)
        {
            // Players can be assigned for the first time (Pending) or changed any
            // time before the game actually starts (Ready) - once InProgress or
            // Complete, the roster is locked in.
            if (_game.data.status != GameStatus.Pending && _game.data.status != GameStatus.Ready)
            {
                throw new ValidationException("Unable to update players for a Game that has already started");
            }

            //Is there enough players selected for the game type
            int requiredPlayers = RequiredPlayers();

            if(_game.data.playerIds.Count != requiredPlayers)
            {
                throw new ValidationException($"Invalid number of players selected for a {_game.data.type} game. Required: {requiredPlayers}");
            }

            // Normally a player can't be selected for more than one game of the
            // same type within a match. With a full 6-player roster there's
            // always enough headcount to avoid that; with only 5 available it's
            // mathematically unavoidable for exactly one game of each type - so
            // the exception is scoped to just the LAST game of that type
            // (highest order), which alone is allowed to reuse a player already
            // assigned to an earlier game of the same type.
            var siblings = gamesOfSameType ?? new List<Game>();
            bool onlyFivePlayersAvailable = matchAvailablePlayerCount == 5;
            bool isLastGameOfType = siblings.Count == 0 || _game.data.order == siblings.Max(g => g.data.order);

            if (onlyFivePlayersAvailable && isLastGameOfType)
            {
                return;
            }

            var usedElsewhere = siblings
                .Where(g => g.Id != _game.Id)
                .SelectMany(g => g.data.playerIds ?? new List<Guid>())
                .ToHashSet();

            if (_game.data.playerIds.Any(id => usedElsewhere.Contains(id)))
            {
                throw new ValidationException($"Player(s) already assigned to another {_game.data.type} game in this match");
            }
        }

    }
}
