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

        public void IsValidToCompleteLeg()
        {
           
        }


    }
}
