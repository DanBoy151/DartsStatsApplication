using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using DartsStatsApplication.Server.Services.Validators;

namespace DartsStatsApplication.Server.Controllers
{

    /// <summary>
    /// Controller to Manage Player Information
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class PlayerController : ControllerBase
    {
        private readonly IDocumentStore _documentStore;

        public PlayerController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }


        /// <summary>
        /// Get a List of All Players
        /// </summary>
        /// <param name="skip">Number of results to skip (default 0).</param>
        /// <param name="take">Number of results to return (default 100, capped at 500).</param>
        /// <returns></returns>
        // GET: api/<PlayerController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Player>>> GetAllPlayers(int skip = 0, int take = 100)
        {
            skip = Math.Max(skip, 0);
            take = Math.Clamp(take, 1, 500);

            using (var session = _documentStore.QuerySession())
            {
                var allPlayers = await session.Query<Player>()
                    .OrderBy(p => p.Id)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();
                return Ok(allPlayers);
            }

        }

        /// <summary>
        /// Get every player's aggregated career stats - 3-dart average, first 9,
        /// leg win/loss record, score tiers, best leg, and highest checkout -
        /// computed across every leg they've played in, not just one match.
        /// Ranked by 3-dart average, highest first.
        /// </summary>
        /// <returns></returns>
        [HttpGet("stats")]
        public async Task<ActionResult<List<PlayerStatsData>>> GetPlayerStats()
        {
            using (var session = _documentStore.QuerySession())
            {
                var players = (await session.Query<Player>().ToListAsync()).ToList();
                var legs = (await session.Query<Leg>().ToListAsync()).ToList();

                var stats = PlayerStatsCalculator.Calculate(players, legs);
                return Ok(stats);
            }
        }

        /// <summary>
        /// Get a specific player by ID
        /// </summary>
        /// <param name="id"></param> The Id of the player to retrieve
        /// <returns></returns>
        // GET api/<PlayerController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Player>> GetPlayer(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }
                return Ok(player);
            }
        }

        /// <summary>
        /// Create a New Player
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<Player>> PostPlayer(PlayerData data)
        {
            PlayerControllerValidator.ValidateName(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                await PlayerControllerValidator.ValidateTeamExists(data.teamId, session);

                var Id = Guid.NewGuid();
                Player player = new Player
                {
                    Id = Id,
                    data = data,
                };

                session.Store(player);
                await session.SaveChangesAsync();

                return CreatedAtAction(nameof(GetPlayer), new { id = Id }, player);
            }
        }

        /// <summary>
        /// Rename an existing player
        /// </summary>
        /// <param name="id"></param>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}")]
        public async Task<ActionResult<Player>> PutPlayer(Guid id, PlayerData data)
        {
            PlayerControllerValidator.ValidateName(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }

                await PlayerControllerValidator.ValidateTeamExists(data.teamId, session);

                player.data = data;
                session.Store(player);
                await session.SaveChangesAsync();

                return Ok(player);
            }
        }

        /// <summary>
        /// Delete a player, as long as they haven't already been used in a Match or Game
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlayer(Guid id)
        {
            using (var session = _documentStore.LightweightSession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }

                await PlayerControllerValidator.ValidateCanDeletePlayer(id, session);

                session.Delete<Player>(id);
                await session.SaveChangesAsync();

                return NoContent();
            }
        }

    }
}
