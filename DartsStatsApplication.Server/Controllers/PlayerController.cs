using Microsoft.AspNetCore.Mvc;
using Marten;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;

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
        /// <returns></returns>
        // GET: api/<PlayerController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Player>>> GetAllPlayers()
        {
            using (var session = _documentStore.QuerySession())
            {
                var allPlayers = await session.Query<Player>().ToListAsync();
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

            using (var session = _documentStore.LightweightSession())
            {
                try
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
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }
            }
        }

    }
}
