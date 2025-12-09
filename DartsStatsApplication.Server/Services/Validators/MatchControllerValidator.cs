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

        public string IsValidToCompleteMatch()
        {
            string errCode = "";

            errCode = IsValidMatchToComplete();
            errCode = IsValidPlayerOfMatch();

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
            if (_match.data.status != MatchStatus.Ready)
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
        /// Validate that the player who has been chosen for player of the match has played at least one leg within the match
        /// </summary>
        /// <returns></returns>
        private string IsValidPlayerOfMatch()
        {
            string errCode = "Player is not a valid Player of the Match";
            errCode = "";
            return errCode;
        }

        /// <summary>
        /// Validate that all Legs & Games within the match have been completed
        /// </summary>
        /// <returns></returns>
        private string IsValidMatchToComplete()
        {
            string errCode = "It is currently invalid to complete the match";
            errCode = "";
            return errCode;
        }
    }
}
