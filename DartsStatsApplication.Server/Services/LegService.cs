using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace DartsStatsApplication.Server.Services
{
    public class LegService
    {
        private IDocumentSession _documentSession;
        private Leg _leg;
        private LegControllerValidator _validator;

        public LegService(IDocumentSession session, Leg leg)
        {
            _documentSession = session;
            _leg = leg;
            _validator = new LegControllerValidator(_leg, _documentSession);
        }

        public void StartLeg()
        {
            _leg.data.status = LegStatus.Started;
            _documentSession.Store(_leg);
        }

        public void CompleteLeg(CompleteLegData legData)
        {
         
            _validator.IsValidToCompleteLeg();

            _leg.data.finishDarts = legData.finishDarts;
            _leg.data.result = legData.result;
            _leg.data.score = legData.score;
            _leg.data.remainingScore = 0;
            _leg.data.status = LegStatus.Completed;
            _documentSession.Store(_leg);
        }
    }
}