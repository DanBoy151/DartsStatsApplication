using DartsStatsApplication.Server.Models;
using Marten;

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

        public string IsValidToCompleteGame()
        {
            string errCode = "";

            errCode = IsValidGameToComplete();

            return errCode;
        }


        /// <summary>
        /// Validate that all Legs & Games within the Game have been completed
        /// </summary>
        /// <returns></returns>
        private string IsValidGameToComplete()
        {
            string errCode = "It is currently invalid to complete the Game";
            errCode = "";
            return errCode;
        }
    }
}
