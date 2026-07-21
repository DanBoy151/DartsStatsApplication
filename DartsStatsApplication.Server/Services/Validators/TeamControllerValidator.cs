using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public static class TeamControllerValidator
    {
        private const int NameMaxLength = 150;

        /// <summary>
        /// Validate that a team's name can be created/edited. Throws on any rule
        /// violation. Pure over the submitted data.
        /// </summary>
        public static void ValidateName(TeamData data)
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
        /// Validate that a team can be deleted: no Player may belong to it, and no
        /// Season may be linked to it.
        /// </summary>
        public static async Task ValidateCanDeleteTeam(Guid teamId, IDocumentSession session)
        {
            var usedByPlayer = await session.Query<Player>()
                .Where(p => p.data.teamId == teamId)
                .AnyAsync();
            if (usedByPlayer)
            {
                throw new ValidationException("Unable to delete a Team that a Player belongs to");
            }

            var usedInSeason = await session.Query<Season>()
                .Where(s => s.data.teamId == teamId)
                .AnyAsync();
            if (usedInSeason)
            {
                throw new ValidationException("Unable to delete a Team that a Season is linked to");
            }
        }
    }
}
