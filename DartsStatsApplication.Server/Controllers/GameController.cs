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
        }

        /// <summary>
        /// Complete a Game
        /// </summary>
        /// <param name="data"></param>
        /// <returns></returns>
        [HttpPut]
        public async Task<ActionResult<Game>> CompleteGame(CompleteGameData data)
        {

            using (var session = _documentStore.LightweightSession())
            {
                var Game = await session.LoadAsync<Game>(data.Id);
                if (Game == null)
                {
                    return NotFound();
                }

                Game.data.status = GameStatus.Complete;
                try
                {
                    GameControllerValidator validator = new GameControllerValidator(Game, session);
                    validator.IsValidToCompleteGame();
                    session.Store(Game);
                    await session.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    return BadRequest(ex.Message);
                }

                return Ok(Game);
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
                var game = await session.LoadAsync<Game>(Id);
                if (game == null)
                {
                    return NotFound();
                }

                game.data.status = GameStatus.InProgress;
                game.data.wonBull = wonBull;

                session.Store(game);
                await session.SaveChangesAsync();

                return Ok(game);
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
                var game = await session.LoadAsync<Game>(Id);
                if (game == null)
                {
                    return NotFound();
                }

                try
                {
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
    }
}
