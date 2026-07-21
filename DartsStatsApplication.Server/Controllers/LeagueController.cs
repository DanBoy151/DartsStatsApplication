using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services.Validators;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to manage League configuration - the ruleset a Season (and
    /// therefore the Matches under it) plays by.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class LeagueController : ControllerBase
    {
        private readonly IDocumentStore _documentStore;

        public LeagueController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List of All Leagues
        /// </summary>
        /// <param name="skip">Number of results to skip (default 0).</param>
        /// <param name="take">Number of results to return (default 100, capped at 500).</param>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<League>>> GetAllLeagues(int skip = 0, int take = 100)
        {
            skip = Math.Max(skip, 0);
            take = Math.Clamp(take, 1, 500);

            using (var session = _documentStore.QuerySession())
            {
                var allLeagues = await session.Query<League>()
                    .OrderBy(l => l.Id)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();
                return Ok(allLeagues);
            }
        }

        /// <summary>
        /// Get a specific League by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<League>> GetLeague(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var league = await session.LoadAsync<League>(id);
                if (league == null)
                {
                    return NotFound();
                }
                return Ok(league);
            }
        }

        /// <summary>
        /// Create a new League
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<League>> PostLeague(LeagueData data)
        {
            LeagueControllerValidator.ValidateLeague(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var Id = Guid.NewGuid();
                League league = new League
                {
                    Id = Id,
                    data = data,
                };

                session.Store(league);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetLeague), new { id = Id }, league);
            }
        }

        /// <summary>
        /// Edit an existing League's config
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<League>> PutLeague(Guid id, LeagueData data)
        {
            LeagueControllerValidator.ValidateLeague(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var league = await session.LoadAsync<League>(id);
                if (league == null)
                {
                    return NotFound();
                }

                league.data = data;
                session.Store(league);
                await session.SaveChangesAsync();

                return Ok(league);
            }
        }

        /// <summary>
        /// Delete a League, as long as no Season is linked to it
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLeague(Guid id)
        {
            using (var session = _documentStore.LightweightSession())
            {
                var league = await session.LoadAsync<League>(id);
                if (league == null)
                {
                    return NotFound();
                }

                await LeagueControllerValidator.ValidateCanDeleteLeague(id, session);

                session.Delete<League>(id);
                await session.SaveChangesAsync();

                return NoContent();
            }
        }
    }
}
