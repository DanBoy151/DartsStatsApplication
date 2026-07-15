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

        public void IsValidToStartMatch()
        {
            //Validate that only no other In Progress Matches Exist
            var inProgMatch = _documentSession.Query<Match>().Where(q => q.data.status == MatchStatus.InProgress).FirstOrDefault();
            if (inProgMatch != null) {
                throw new Exception("Unable to start Match as existing In Progress Match Exists");
            }
        }

        public void ValidateAvailablePlayers()
        {
            //Validate that we are attaching available players to an In Progress Match
            if (_match.data.status != MatchStatus.Ready && _match.data.status != MatchStatus.InProgress)
            {
                throw new Exception("Unable to add players to a match that is not Ready");
            }

            //Validate that a list of available players has been passed in
            if (_match.data.availablePlayers == null || _match.data.availablePlayers.Count == 0) {
                throw new Exception("No Players Selected");
            }

            //Validate that there are enough players selected to play a match >5
            if (_match.data.availablePlayers.Count < 5)
            {
                throw new Exception("Not Enough Players Selected");
            }

            //Validate that each of the players actually exist
            foreach (Guid id in _match.data.availablePlayers)
            {
                var player = _documentSession.Query<Player>().Where(p => p.Id == id).First();
                if (player == null)
                {
                    throw new Exception("Player doesnt exist");
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
