using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using DartsStatsApplication.Server.Services.Validators;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to manage Seasons - one Team's campaign in one League,
    /// containing the Matches played under it.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class SeasonController : ControllerBase
    {
        private readonly IDocumentStore _documentStore;

        public SeasonController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List of All Seasons, each with its computed status
        /// </summary>
        /// <param name="skip">Number of results to skip (default 0).</param>
        /// <param name="take">Number of results to return (default 100, capped at 500).</param>
        [HttpGet]
        public async Task<ActionResult<List<SeasonResponse>>> GetAllSeasons(int skip = 0, int take = 100)
        {
            skip = Math.Max(skip, 0);
            take = Math.Clamp(take, 1, 500);

            using (var session = _documentStore.QuerySession())
            {
                var seasons = (await session.Query<Season>()
                    .OrderBy(s => s.Id)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync()).ToList();

                var response = await BuildResponses(seasons, session);
                return Ok(response);
            }
        }

        /// <summary>
        /// Get a specific Season by ID, with its computed status
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<SeasonResponse>> GetSeason(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var season = await session.LoadAsync<Season>(id);
                if (season == null)
                {
                    return NotFound();
                }

                var response = await BuildResponses(new List<Season> { season }, session);
                return Ok(response[0]);
            }
        }

        /// <summary>
        /// Create a new Season
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Season>> PostSeason(SeasonData data)
        {
            SeasonControllerValidator.ValidateNewSeason(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                await SeasonControllerValidator.ValidateLeagueAndTeamExist(data, session);

                var Id = Guid.NewGuid();
                Season season = new Season
                {
                    Id = Id,
                    data = data,
                };

                session.Store(season);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetSeason), new { id = Id }, season);
            }
        }

        /// <summary>
        /// Edit an existing Season. League/Team can only be changed while the
        /// season has no Matches yet; the name is always editable.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<Season>> PutSeason(Guid id, SeasonData data)
        {
            SeasonControllerValidator.ValidateNewSeason(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var season = await session.LoadAsync<Season>(id);
                if (season == null)
                {
                    return NotFound();
                }

                await SeasonControllerValidator.ValidateLeagueAndTeamExist(data, session);
                await SeasonControllerValidator.ValidateCanEditLeagueOrTeam(season, data, session);

                season.data = data;
                session.Store(season);
                await session.SaveChangesAsync();

                return Ok(season);
            }
        }

        /// <summary>
        /// Delete a Season, as long as no Match is linked to it
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSeason(Guid id)
        {
            using (var session = _documentStore.LightweightSession())
            {
                var season = await session.LoadAsync<Season>(id);
                if (season == null)
                {
                    return NotFound();
                }

                await SeasonControllerValidator.ValidateCanDeleteSeason(id, session);

                session.Delete<Season>(id);
                await session.SaveChangesAsync();

                return NoContent();
            }
        }

        /// <summary>
        /// Batches one Match query for the whole set of seasons (avoids N+1), groups
        /// by seasonId in memory, and runs SeasonStatusCalculator per season.
        /// </summary>
        private static async Task<List<SeasonResponse>> BuildResponses(List<Season> seasons, IQuerySession session)
        {
            var seasonIds = seasons.Select(s => s.Id).ToList();
            var matches = (await session.Query<Match>()
                .Where(m => m.data.seasonId != null && seasonIds.Contains(m.data.seasonId!.Value))
                .ToListAsync()).ToList();

            return seasons.Select(season =>
            {
                var statuses = matches
                    .Where(m => m.data.seasonId == season.Id)
                    .Select(m => m.data.status)
                    .ToList();

                return new SeasonResponse
                {
                    id = season.Id,
                    data = season.data,
                    status = SeasonStatusCalculator.Calculate(statuses),
                };
            }).ToList();
        }
    }
}
