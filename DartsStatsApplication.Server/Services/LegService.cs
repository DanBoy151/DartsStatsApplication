using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;
using Marten;

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
            _validator.IsValidToCompleteLeg(legData);

            _leg.data.finishDarts = legData.finishDarts;
            _leg.data.result = legData.result;
            _leg.data.score = legData.score;
            _leg.data.remainingScore = legData.remainingScore;
            _leg.data.status = LegStatus.Completed;
            _documentSession.Store(_leg);
        }

        /// <summary>
        /// Completes a leg that's been decided by bull-off (the game's configured max
        /// rounds was reached with no winner). The real throws already made before the
        /// threshold are persisted here too - they still count for stats - but no
        /// checkout occurred, so finishDarts stays null and wonByBullOff is set.
        /// </summary>
        public async Task CompleteLegByBullOff(CompleteLegBullOffData data)
        {
            var game = await _documentSession.LoadAsync<Game>(_leg.data.gameID);

            _validator.IsValidToCompleteLegByBullOff(data, game);

            _leg.data.score = data.score ?? new List<PlayerScore>();
            _leg.data.remainingScore = data.remainingScore;
            _leg.data.result = data.result;
            _leg.data.wonByBullOff = true;
            _leg.data.finishDarts = null;
            _leg.data.status = LegStatus.Completed;
            _documentSession.Store(_leg);
        }
    }
}