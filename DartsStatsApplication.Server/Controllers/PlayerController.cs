using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
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
            PlayerControllerValidator.ValidateNewPlayer(data);
            data.name = data.name.Trim();

            using (var session = _documentStore.LightweightSession())
            {
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

    }
}
