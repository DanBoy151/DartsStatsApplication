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
        [HttpPut("{id}/complete")]
        public async Task<ActionResult<Leg>> CompleteLeg(Guid id, [FromBody] CompleteLegData leg)
        {

            Console.WriteLine($"Received request to complete leg with id: {id}");
            Console.WriteLine(JsonSerializer.Serialize(leg));


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

                return Ok(leg);
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
