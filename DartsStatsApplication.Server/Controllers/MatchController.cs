using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to Manage Match Information
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class MatchController : Controller
    {
        private readonly IDocumentStore _documentStore;

        public MatchController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List and Details of All Matches
        /// </summary>
        /// <returns></returns>
        // GET: api/<MatchController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Match>>> GetAllMatches()
        {
            using (var session = _documentStore.QuerySession())
            {
                var allMatches = await session.Query<Match>().ToListAsync();
                return Ok(allMatches);
            }

        }

        /// <summary>
        /// Get a specific match by ID
        /// </summary>
        /// <param name="id"></param> The Id of the match to retrieve
        /// <returns></returns>
        // GET api/<MatchController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Match>> GetMatch(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var match = await session.LoadAsync<Match>(id);
                if (match == null)
                {
                    return NotFound();
                }
                return Ok(match);
            }
        }

        /// <summary>
        /// Create a New Match
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<Match>> CreateMatch(MatchData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var Id = Guid.NewGuid();
                Match match = new Match
                {
                    Id = Id,
                    data = data,
                };

                session.Store(match);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetMatch), new { id = Id }, match);
            }
        }

        /// <summary>
        /// Complete a Match
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut]
        public async Task<ActionResult<Match>> CompleteMatch(CompleteMatchData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var match = await session.LoadAsync<Match>(data.Id);
                if (match == null)
                {
                    return NotFound();
                }

                match.data.status = MatchStatus.Completed;
                match.data.playerOfMatch = data.playerOfMatch;

                MatchControllerValidator validator = new MatchControllerValidator(match, session);
                string err = validator.IsValidToCompleteMatch();
                if (err != string.Empty)
                {
                    return BadRequest(err);
                }

                session.Store(match);
                await session.SaveChangesAsync();

                return Ok(match);
            }
        }

        /// <summary>
        /// Start a Match
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPut("{id}/start")]
        public async Task<ActionResult<Match>> StartMatch(Guid id, [FromBody] StartMatchData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var match = await session.LoadAsync<Match>(id);
                if (match == null)
                {
                    return NotFound();
                }

                match.data.status = MatchStatus.InProgress;
                match.data.availablePlayers = data.availablePlayers;

                MatchControllerValidator validator = new MatchControllerValidator(match, session);
                string err = validator.IsValidToStartMatch();
                if (err != string.Empty)
                {
                    return BadRequest(err);
                }

                session.Store(match);
                await session.SaveChangesAsync();

                return Ok(match);
            }
        }
    }
}
