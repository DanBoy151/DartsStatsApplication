using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
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
        /// <returns></returns>
        // GET: api/<LegController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Leg>>> GetAllLegs()
        {
            using (var session = _documentStore.QuerySession())
            {
                var allLegs = await session.Query<Leg>().ToListAsync();
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
        [HttpPut]
        public async Task<ActionResult<Leg>> CompleteLeg(CompleteLegData leg)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var existLeg = await session.LoadAsync<Leg>(leg.Id);
                if (existLeg == null)
                {
                    return NotFound();
                }

                existLeg.data.status = LegStatus.Completed;
                existLeg.data.finishDarts = leg.finishDarts;
                existLeg.data.result = leg.result;
                existLeg.data.score = leg.score;

                LegControllerValidator validator = new LegControllerValidator(existLeg, session);
                string err = validator.IsValidToCompleteLeg();
                if (err != string.Empty)
                {
                    return BadRequest(err);
                }

                session.Store(leg);
                await session.SaveChangesAsync();

                return Ok(leg);
            }
        }
    }
}
