using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public static class PlayerControllerValidator
    {
        private const int NameMaxLength = 100;

        /// <summary>
        /// Validate that a player's name can be created/edited. Throws on any rule
        /// violation. Pure over the submitted data, so no session/query is needed here -
        /// the same rules apply whether this is a new player or a rename.
        /// </summary>
        public static void ValidateName(PlayerData data)
        {
            if (data == null || string.IsNullOrWhiteSpace(data.name))
            {
                throw new ValidationException("Name is required");
            }

            if (data.name.Trim().Length > NameMaxLength)
            {
                throw new ValidationException($"Name must be {NameMaxLength} characters or fewer");
            }
        }

        /// <summary>
        /// Validate that a player can be deleted: they must not already be part of any
        /// Match's roster or any Game's selected players, or deleting them would leave
        /// those records pointing at a Player that no longer exists.
        /// </summary>
        public static async Task ValidateCanDeletePlayer(Guid playerId, IDocumentSession session)
        {
            var usedInMatch = await session.Query<Match>()
                .Where(m => m.data.availablePlayers != null && m.data.availablePlayers.Contains(playerId))
                .AnyAsync();
            if (usedInMatch)
            {
                throw new ValidationException("Unable to delete a Player who is part of a Match roster");
            }

            var usedInGame = await session.Query<Game>()
                .Where(g => g.data.playerIds != null && g.data.playerIds.Contains(playerId))
                .AnyAsync();
            if (usedInGame)
            {
                throw new ValidationException("Unable to delete a Player who has been selected for a Game");
            }
        }
    }
}
