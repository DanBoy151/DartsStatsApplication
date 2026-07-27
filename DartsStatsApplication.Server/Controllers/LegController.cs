using System.Text.Json;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using DartsStatsApplication.Server.Services.Validators;
using Marten;
using Microsoft.AspNetCore.Mvc;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to Manage Leg Information
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class LegController : Controller
    {
        private readonly IDocumentStore _documentStore;

        public LegController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List and Details of All Legs
        /// </summary>
        /// <param name="skip">Number of results to skip (default 0).</param>
        /// <param name="take">Number of results to return (default 100, capped at 500).</param>
        /// <returns></returns>
        // GET: api/<LegController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Leg>>> GetAllLegs(int skip = 0, int take = 100)
        {
            skip = Math.Max(skip, 0);
            take = Math.Clamp(take, 1, 500);

            using (var session = _documentStore.QuerySession())
            {
                var allLegs = await session.Query<Leg>()
                    .OrderBy(l => l.Id)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();
                return Ok(allLegs);
            }

        }

        /// <summary>
        /// Get a specific Leg by ID
        /// </summary>
        /// <param name="id"></param> The Id of the Leg to retrieve
        /// <returns></returns>
        // GET api/<LegController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Leg>> GetLeg(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var Leg = await session.LoadAsync<Leg>(id);
                if (Leg == null)
                {
                    return NotFound();
                }
                return Ok(Leg);
            }
        }

        /// <summary>
        /// Create a New Leg
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<Leg>> CreateLeg(LegData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var Id = Guid.NewGuid();
                Leg Leg = new Leg
                {
                    Id = Id,
                    data = data,
                };

                session.Store(Leg);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetLeg), new { id = Id }, Leg);
            }
        }

        /// <summary>
        /// Complete a Leg
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}/complete")]
        public async Task<ActionResult<Leg>> CompleteLeg(Guid id, [FromBody] CompleteLegData leg)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var existLeg = await session.LoadAsync<Leg>(id);
                if (existLeg == null)
                {
                    return NotFound();
                }

                LegService service = new LegService(session, existLeg);
                service.CompleteLeg(leg);

                await session.SaveChangesAsync();

                return Ok(existLeg);
            }
        }

        /// <summary>
        /// Complete a Leg via bull-off - once the game's configured max rounds has
        /// been reached with no winner, the leg is decided by this instead of a
        /// normal checkout.
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}/complete-bull-off")]
        public async Task<ActionResult<Leg>> CompleteLegByBullOff(Guid id, [FromBody] CompleteLegBullOffData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var existLeg = await session.LoadAsync<Leg>(id);
                if (existLeg == null)
                {
                    return NotFound();
                }

                LegService service = new LegService(session, existLeg);
                await service.CompleteLegByBullOff(data);

                await session.SaveChangesAsync();

                return Ok(existLeg);
            }
        }

        /// <summary>
        /// Save the in-progress throw history for a Started leg, without
        /// completing it - called when the user navigates away mid-leg
        /// (Home/top menu), so the leg can be correctly resumed later even if
        /// the client's local state has been lost (a different device, a
        /// cleared browser, or the store's own 6-hour expiry).
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}/progress")]
        public async Task<ActionResult<Leg>> SaveLegProgress(Guid id, [FromBody] SaveLegProgressData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var existLeg = await session.LoadAsync<Leg>(id);
                if (existLeg == null)
                {
                    return NotFound();
                }

                LegService service = new LegService(session, existLeg);
                service.SaveProgress(data);

                await session.SaveChangesAsync();

                return Ok(existLeg);
            }
        }

        /// <summary>
        /// Start a Leg
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}/start")]
        public async Task<ActionResult<Leg>> StartLeg(Guid Id)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var existLeg = await session.LoadAsync<Leg>(Id);
                if (existLeg == null)
                {
                    return NotFound();
                }

                LegService service = new LegService(session, existLeg);
                service.StartLeg();

                await session.SaveChangesAsync();

                return Ok(existLeg);
            }
        }
    }
}
