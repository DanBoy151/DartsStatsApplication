using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using DartsStatsApplication.Server.Services.Validators;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to manage Teams - a roster of Players that plays Seasons
    /// within Leagues.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class TeamController : ControllerBase
    {
        private readonly IDocumentStore _documentStore;

        public TeamController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List of All Teams
        /// </summary>
        /// <param name="skip">Number of results to skip (default 0).</param>
        /// <param name="take">Number of results to return (default 100, capped at 500).</param>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Team>>> GetAllTeams(int skip = 0, int take = 100)
        {
            skip = Math.Max(skip, 0);
            take = Math.Clamp(take, 1, 500);

            using (var session = _documentStore.QuerySession())
            {
                var allTeams = await session.Query<Team>()
                    .OrderBy(t => t.Id)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();
                return Ok(allTeams);
            }
        }

        /// <summary>
        /// Get a specific Team by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Team>> GetTeam(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var team = await session.LoadAsync<Team>(id);
                if (team == null)
                {
                    return NotFound();
                }
                return Ok(team);
            }
        }

        /// <summary>
        /// Get every Season this Team has played, each with its computed status
        /// </summary>
        [HttpGet("{id}/seasons")]
        public async Task<ActionResult<List<SeasonResponse>>> GetTeamSeasons(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var team = await session.LoadAsync<Team>(id);
                if (team == null)
                {
                    return NotFound();
                }

                var seasons = (await session.Query<Season>()
                    .Where(s => s.data.teamId == id)
                    .ToListAsync()).ToList();

                var seasonIds = seasons.Select(s => s.Id).ToList();
                var matches = (await session.Query<Match>()
                    .Where(m => m.data.seasonId != null && seasonIds.Contains(m.data.seasonId!.Value))
                    .ToListAsync()).ToList();

                var response = seasons.Select(season =>
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

                return Ok(response);
            }
        }

        /// <summary>
        /// Get this Team's aggregated player stats - optionally scoped to a single
        /// Season (query string), otherwise across every Season the team has played.
        /// </summary>
        [HttpGet("{id}/stats")]
        public async Task<ActionResult<List<PlayerStatsData>>> GetTeamStats(Guid id, Guid? seasonId = null)
        {
            using (var session = _documentStore.QuerySession())
            {
                var team = await session.LoadAsync<Team>(id);
                if (team == null)
                {
                    return NotFound();
                }

                var players = (await session.Query<Player>()
                    .Where(p => p.data.teamId == id)
                    .ToListAsync()).ToList();

                var seasons = (await session.Query<Season>()
                    .Where(s => s.data.teamId == id)
                    .ToListAsync()).ToList();

                if (seasonId != null)
                {
                    if (!seasons.Any(s => s.Id == seasonId.Value))
                    {
                        return BadRequest("That Season does not belong to this Team");
                    }
                    seasons = seasons.Where(s => s.Id == seasonId.Value).ToList();
                }

                var seasonIds = seasons.Select(s => s.Id).ToList();
                var matches = (await session.Query<Match>()
                    .Where(m => m.data.seasonId != null && seasonIds.Contains(m.data.seasonId!.Value))
                    .ToListAsync()).ToList();

                var matchIds = matches.Select(m => m.Id).ToList();
                var games = (await session.Query<Game>()
                    .Where(g => matchIds.Contains(g.data.matchId))
                    .ToListAsync()).ToList();

                var gameIds = games.Select(g => g.Id).ToList();
                var legs = (await session.Query<Leg>()
                    .Where(l => gameIds.Contains(l.data.gameID))
                    .ToListAsync()).ToList();

                return Ok(PlayerStatsCalculator.Calculate(players, legs));
            }
        }

        /// <summary>
        /// Create a new Team
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Team>> PostTeam(TeamData data)
        {
            TeamControllerValidator.ValidateName(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var Id = Guid.NewGuid();
                Team team = new Team
                {
                    Id = Id,
                    data = data,
                };

                session.Store(team);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetTeam), new { id = Id }, team);
            }
        }

        /// <summary>
        /// Rename an existing Team
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<Team>> PutTeam(Guid id, TeamData data)
        {
            TeamControllerValidator.ValidateName(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var team = await session.LoadAsync<Team>(id);
                if (team == null)
                {
                    return NotFound();
                }

                team.data = data;
                session.Store(team);
                await session.SaveChangesAsync();

                return Ok(team);
            }
        }

        /// <summary>
        /// Delete a Team, as long as no Player belongs to it and no Season is linked to it
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(Guid id)
        {
            using (var session = _documentStore.LightweightSession())
            {
                var team = await session.LoadAsync<Team>(id);
                if (team == null)
                {
                    return NotFound();
                }

                await TeamControllerValidator.ValidateCanDeleteTeam(id, session);

                session.Delete<Team>(id);
                await session.SaveChangesAsync();

                return NoContent();
            }
        }
    }
}
