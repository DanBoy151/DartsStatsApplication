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

        public string IsValidToStartMatch()
        {
            string errCode = "";

            foreach (Guid id in _match.data.availablePlayers)
            {
                var player = _documentSession.Query<Player>().Where(p => p.Id == id).First();
                if (player == null)
                {
                    errCode = "Player doesnt Exist";
                    break;
                }
            }

            return errCode;
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
