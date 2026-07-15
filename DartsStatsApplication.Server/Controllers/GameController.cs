using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Models;
using DartsStatsApplication.Server.Services;
using DartsStatsApplication.Server.Services.Validators;
using Marten;
using Microsoft.AspNetCore.Mvc;

namespace DartsStatsApplication.Server.Controllers
{
    /// <summary>
    /// Controller to Manage Game Information
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class GameController : Controller
    {
        private readonly IDocumentStore _documentStore;

        public GameController(IDocumentStore documentStore)
        {
            _documentStore = documentStore;
        }

        /// <summary>
        /// Get a List and Details of All Games
        /// </summary>
        /// <returns></returns>
        // GET: api/<GameController>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Game>>> GetAllGames()
        {
            using (var session = _documentStore.QuerySession())
            {
                var allGames = await session.Query<Game>().ToListAsync();
                return Ok(allGames);
            }

        }

        /// <summary>
        /// Get a specific Game by ID
        /// </summary>
        /// <param name="id"></param> The Id of the Game to retrieve
        /// <returns></returns>
        // GET api/<GameController>/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Game>> GetGame(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var Game = await session.LoadAsync<Game>(id);
                if (Game == null)
                {
                    return NotFound();
                }
                return Ok(Game);
            }
        }

        /// <summary>
        /// Create a New Game
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<Game>> CreateGame(GameData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                try
                {
                    var Id = Guid.NewGuid();
                    Game Game = new Game
                    {
                        Id = Id,
                        data = data,
                    };

                    session.Store(Game);
                    await session.SaveChangesAsync();
                    return CreatedAtAction(nameof(GetGame), new { id = Id }, Game);
                }
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }

            }
        }

        /// <summary>
        /// Complete a Game
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut("{id}/complete")]
        public async Task<ActionResult<Game>> CompleteGame(Guid Id, [FromBody] CompleteGameData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                try
                {
                    var Game = await session.LoadAsync<Game>(Id);
                    if (Game == null)
                    {
                        return NotFound();
                    }

                    GameService service = new GameService(session, Game);
                    service.CompleteGame(data);

                    await session.SaveChangesAsync();
                    return Ok(Game);
                }
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }
            }
        }

        /// <summary>
        /// Start a Game
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPut("{id}/start")]
        public async Task<ActionResult<Game>> StartGame(Guid Id, Boolean wonBull)
        {

            using (var session = _documentStore.LightweightSession())
            {
                try
                {
                    var game = await session.LoadAsync<Game>(Id);
                    if (game == null)
                    {
                        return NotFound();
                    }

                    GameService service = new GameService(session, game);
                    service.StartGame(wonBull);

                    await session.SaveChangesAsync();
                    return Ok(game);
                }
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }
            }
        }

        /// <summary>
        /// Update the selected players for a Game
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        [HttpPut("{id}/update-players")]
        public async Task<ActionResult<Game>> UpdatePlayers(Guid Id, [FromBody] UpdatePlayersData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                try
                {
                    var game = await session.LoadAsync<Game>(Id);
                    if (game == null)
                    {
                        return NotFound();
                    }

                    GameService service = new GameService(session, game);
                    service.UpdateAvailablePlayers(data.selectedPlayers);

                    await session.SaveChangesAsync();

                    return Ok(game);
                }
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }
            }
        }

        /// <summary>
        /// Get Legs Linked to a Game
        /// </summary>
        /// <returns></returns>
        // GET: api/<GameController>
        [HttpGet("{id}/legs")]
        public async Task<ActionResult<IEnumerable<Leg>>> GetGameLegs(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var game = session.Query<Game>().Where(x => x.Id == id).FirstOrDefault();

                if (game == null)
                {
                    return NotFound();
                }

                var allLegs = (await session.Query<Leg>()
                    .Where(x => x.data.gameID == id)
                    .ToListAsync())
                    .OrderBy(x => x.data.order)
                    .ToList();

                return Ok(allLegs);
            }

        }

    }
}
