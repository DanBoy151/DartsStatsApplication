using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public class MatchControllerValidator
    {
        private Match _match;
        private readonly IDocumentSession _documentSession;

        public MatchControllerValidator(Match match, IDocumentSession documentSession)
        {
            _match = match;
            _documentSession = documentSession;
        }

        /// <summary>
        /// Validate that a match can be completed. Returns an empty string when valid, or a
        /// descriptive error message otherwise (this validator uses the string-return
        /// convention that MatchController.CompleteMatch already expects).
        /// The match's games are passed in (loaded by the caller) so the rules stay pure
        /// and unit-testable without a session.
        /// </summary>
        public string IsValidToCompleteMatch(List<Game> games)
        {
            // Return the FIRST failing check. (Previously both results were assigned to the
            // same variable, so the games check was silently discarded by the player check.)
            string errCode = IsValidMatchToComplete(games);
            if (errCode != string.Empty)
            {
                return errCode;
            }

            errCode = IsValidPlayerOfMatch(games);
            return errCode;
        }

        private const int OpponentMaxLength = 200;

        /// <summary>
        /// Opponent/date checks shared by create and edit. Pure over the submitted data.
        /// </summary>
        private static void ValidateOpponentAndDate(MatchData data)
        {
            if (data == null || string.IsNullOrWhiteSpace(data.opponent))
            {
                throw new ValidationException("Opponent is required");
            }

            if (data.opponent.Trim().Length > OpponentMaxLength)
            {
                throw new ValidationException($"Opponent must be {OpponentMaxLength} characters or fewer");
            }

            if (data.date == default)
            {
                throw new ValidationException("Date is required");
            }
        }

        /// <summary>
        /// Validate that a new match can be created. Throws on any rule violation.
        /// Pure over the submitted data (no existing Match, no session needed), so this is
        /// static rather than an instance method like the others here.
        /// </summary>
        public static void ValidateNewMatch(MatchData data)
        {
            ValidateOpponentAndDate(data);

            // A newly created match hasn't been played yet - reject a client trying to
            // hand-craft one that's already Ready/InProgress/Completed and skip the normal
            // start -> roster -> play lifecycle.
            if (data.status != MatchStatus.Scheduled)
            {
                throw new ValidationException("New matches must be created with Scheduled status");
            }
        }

        /// <summary>
        /// Validate that an existing match's opponent/date/location can be edited. Throws on
        /// any rule violation. Only Scheduled matches are editable - once a match has moved
        /// on (roster set, played, completed), its record of what actually happened shouldn't
        /// be rewritten via this endpoint.
        /// </summary>
        public static void ValidateEditMatch(Match existingMatch, MatchData data)
        {
            if (existingMatch.data.status != MatchStatus.Scheduled)
            {
                throw new ValidationException("Unable to edit a Match that is not Scheduled");
            }

            ValidateOpponentAndDate(data);
        }

        /// <summary>
        /// Validate that a match can be deleted. Same Scheduled-only restriction as editing,
        /// for the same reason - and a Scheduled match never has Games yet (those are only
        /// created on start), so there's nothing to cascade-delete.
        /// </summary>
        public static void ValidateCanDeleteMatch(Match existingMatch)
        {
            if (existingMatch.data.status != MatchStatus.Scheduled)
            {
                throw new ValidationException("Unable to delete a Match that is not Scheduled");
            }
        }

        /// <summary>
        /// Validate that a match's chosen season (if any) actually exists.
        /// </summary>
        public static async Task ValidateSeasonExists(Guid? seasonId, IDocumentSession session)
        {
            if (seasonId == null) return;

            var season = await session.LoadAsync<Season>(seasonId.Value);
            if (season == null)
            {
                throw new ValidationException("Selected Season does not exist");
            }
        }

        public async Task IsValidToStartMatch()
        {
            //Validate that only no other In Progress Matches Exist
            var inProgMatch = await _documentSession.Query<Match>().Where(q => q.data.status == MatchStatus.InProgress).FirstOrDefaultAsync();
            if (inProgMatch != null) {
                throw new ValidationException("Unable to start Match as existing In Progress Match Exists");
            }
        }

        public async Task ValidateAvailablePlayers()
        {
            //Validate that we are attaching available players to an In Progress Match
            if (_match.data.status != MatchStatus.Ready && _match.data.status != MatchStatus.InProgress)
            {
                throw new ValidationException("Unable to add players to a match that is not Ready");
            }

            //Validate that a list of available players has been passed in
            if (_match.data.availablePlayers == null || _match.data.availablePlayers.Count == 0) {
                throw new ValidationException("No Players Selected");
            }

            //Validate that there are enough players selected to play a match >5
            if (_match.data.availablePlayers.Count < 5)
            {
                throw new ValidationException("Not Enough Players Selected");
            }

            //Validate that each of the players actually exist
            foreach (Guid id in _match.data.availablePlayers)
            {
                var player = await _documentSession.Query<Player>().Where(p => p.Id == id).FirstOrDefaultAsync();
                if (player == null)
                {
                    throw new ValidationException("Player doesnt exist");
                }
            }
        }

        /// <summary>
        /// Validate that the player chosen for player of the match actually played in the
        /// match, i.e. appears in the selected players of at least one game.
        /// </summary>
        private string IsValidPlayerOfMatch(List<Game> games)
        {
            Guid? playerOfMatch = _match.data.playerOfMatch;
            if (playerOfMatch == null)
            {
                return "A Player of the Match must be selected";
            }

            bool played = games != null && games.Any(g =>
                g.data.playerIds != null && g.data.playerIds.Contains(playerOfMatch.Value));

            if (!played)
            {
                return "Player of the Match must have played in at least one game";
            }

            return "";
        }

        /// <summary>
        /// Validate that all games within the match have been completed.
        /// </summary>
        private string IsValidMatchToComplete(List<Game> games)
        {
            if (games == null || games.Count == 0)
            {
                return "Unable to complete a Match that has no Games";
            }

            if (games.Any(g => g.data.status != GameStatus.Complete))
            {
                return "Unable to complete a Match while it has Games that are not Complete";
            }

            return "";
        }
    }
}
