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
        /// Get one player's aggregated stats, optionally scoped to a single
        /// Season and/or a single game type (Singles/Doubles/Trebles) - the
        /// Player Statistics screen calls this once per section (Overall/
        /// Singles/Doubles/Trebles), each with its own independent filters.
        /// </summary>
        [HttpGet("{id}/stats")]
        public async Task<ActionResult<PlayerStatsData>> GetPlayerDetailStats(Guid id, Guid? seasonId = null, GameType? gameType = null)
        {
            using (var session = _documentStore.QuerySession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }

                var joins = await LoadPlayerJoins(id, session);
                var filteredLegs = joins
                    .Where(j => (gameType == null || j.game.data.type == gameType.Value)
                             && (seasonId == null || j.match.data.seasonId == seasonId.Value))
                    .Select(j => j.leg)
                    .ToList();

                var stats = PlayerStatsCalculator.Calculate(new List<Player> { player }, filteredLegs);
                return Ok(stats.FirstOrDefault() ?? new PlayerStatsData { playerId = player.Id, name = player.data.name });
            }
        }

        /// <summary>
        /// Get every Season this specific player has actually appeared in
        /// (derived from their own leg history, not Player.teamId - a
        /// player's season history can span more than one team over time),
        /// each with its computed status. Powers the season dropdown shared
        /// by all four sections of the Player Statistics screen.
        /// </summary>
        [HttpGet("{id}/seasons")]
        public async Task<ActionResult<List<SeasonResponse>>> GetPlayerSeasons(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }

                var joins = await LoadPlayerJoins(id, session);
                var seasonIds = joins
                    .Select(j => j.match.data.seasonId)
                    .Where(s => s != null)
                    .Select(s => s!.Value)
                    .Distinct()
                    .ToList();

                if (seasonIds.Count == 0)
                {
                    return Ok(new List<SeasonResponse>());
                }

                var seasons = (await session.Query<Season>().Where(s => seasonIds.Contains(s.Id)).ToListAsync()).ToList();

                // Status must reflect every match in the season, not just the
                // ones this player personally appeared in.
                var allSeasonMatches = (await session.Query<Match>()
                    .Where(m => m.data.seasonId != null && seasonIds.Contains(m.data.seasonId!.Value))
                    .ToListAsync()).ToList();

                var response = seasons.Select(season =>
                {
                    var statuses = allSeasonMatches
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
        /// Get a player's current Singles form: their last 5 completed
        /// Singles games and whether their average is trending up or down
        /// versus their career Singles average.
        /// </summary>
        [HttpGet("{id}/form")]
        public async Task<ActionResult<PlayerFormData>> GetPlayerForm(Guid id)
        {
            using (var session = _documentStore.QuerySession())
            {
                var player = await session.LoadAsync<Player>(id);
                if (player == null)
                {
                    return NotFound();
                }

                var joins = await LoadPlayerJoins(id, session);
                var singlesJoins = joins
                    .Where(j => j.game.data.type == GameType.Singles && j.game.data.status == GameStatus.Complete)
                    .ToList();

                var recentGameGroups = singlesJoins
                    .GroupBy(j => j.game.Id)
                    .Select(g => new
                    {
                        Game = g.First().game,
                        Match = g.First().match,
                        Legs = g.Select(x => x.leg).ToList(),
                    })
                    .OrderByDescending(g => g.Match.data.date)
                    .ThenByDescending(g => g.Match.data.finishTime)
                    .ThenByDescending(g => g.Game.data.order)
                    .Take(5)
                    .ToList();

                var recentGames = recentGameGroups.Select(g =>
                {
                    var gameStats = PlayerStatsCalculator.Calculate(new List<Player> { player }, g.Legs).FirstOrDefault();
                    return new PlayerFormGame
                    {
                        gameId = g.Game.Id,
                        opponent = g.Match.data.opponent,
                        date = g.Match.data.date,
                        result = g.Game.data.result?.ToString() ?? "",
                        average = gameStats?.threeDartAverage,
                    };
                }).ToList();

                double? recentAverage = recentGameGroups.Count > 0
                    ? PlayerStatsCalculator.Calculate(new List<Player> { player }, recentGameGroups.SelectMany(g => g.Legs).ToList()).FirstOrDefault()?.threeDartAverage
                    : null;

                double? careerAverage = PlayerStatsCalculator.Calculate(new List<Player> { player }, singlesJoins.Select(j => j.leg).ToList()).FirstOrDefault()?.threeDartAverage;

                return Ok(new PlayerFormData
                {
                    recentGames = recentGames,
                    recentAverage = recentAverage,
                    careerAverage = careerAverage,
                    trend = PlayerFormCalculator.DetermineTrend(recentAverage, careerAverage),
                });
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

        /// <summary>
        /// Loads every Leg this player has thrown at least one visit in,
        /// joined to its Game (for type/status/order) and that Game's Match
        /// (for seasonId/date/opponent). Backs GetPlayerDetailStats/
        /// GetPlayerSeasons/GetPlayerForm, which each just filter/group this
        /// differently rather than re-querying the session three times.
        /// Every Game always has a Match (set at creation, and a Match with
        /// Games is never in a deletable state), so there's no null-Match
        /// case to handle here.
        /// </summary>
        private static async Task<List<(Leg leg, Game game, Match match)>> LoadPlayerJoins(Guid playerId, IQuerySession session)
        {
            var allLegs = (await session.Query<Leg>().ToListAsync()).ToList();
            var playerLegs = allLegs
                .Where(l => l.data.score != null && l.data.score.Any(s => s.playerId == playerId))
                .ToList();

            var gameIds = playerLegs.Select(l => l.data.gameID).Distinct().ToList();
            var games = (await session.Query<Game>().Where(g => gameIds.Contains(g.Id)).ToListAsync()).ToList();
            var gamesById = games.ToDictionary(g => g.Id);

            var matchIds = games.Select(g => g.data.matchId).Distinct().ToList();
            var matches = (await session.Query<Match>().Where(m => matchIds.Contains(m.Id)).ToListAsync()).ToList();
            var matchesById = matches.ToDictionary(m => m.Id);

            var joins = new List<(Leg, Game, Match)>();
            foreach (var leg in playerLegs)
            {
                if (!gamesById.TryGetValue(leg.data.gameID, out var game)) continue;
                if (!matchesById.TryGetValue(game.data.matchId, out var match)) continue;
                joins.Add((leg, game, match));
            }
            return joins;
        }
    }
}
