using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public class LegControllerValidator
    {
        private Leg _leg;
        private readonly IDocumentSession _documentSession;

        public LegControllerValidator(Leg leg, IDocumentSession documentSession)
        {
            _leg = leg;
            _documentSession = documentSession;
        }

        public string IsValidToCompleteLeg()
        {
            string errCode = "";

            errCode = IsValidLegToComplete();

            return errCode;
        }


        /// <summary>
        /// Validate that all Legs & Legs within the Leg have been completed
        /// </summary>
        /// <returns></returns>
        private string IsValidLegToComplete()
        {
            string errCode = "It is currently invalid to complete the Leg";
            errCode = "";
            return errCode;
        }
    }
}
