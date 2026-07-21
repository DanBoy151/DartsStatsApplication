using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public static class LeagueControllerValidator
    {
        private const int NameMaxLength = 150;

        /// <summary>
        /// Validate that a league's config can be created/edited. Throws on any rule
        /// violation. Pure over the submitted data - the same rules apply whether this
        /// is a new league or an edit.
        /// </summary>
        public static void ValidateLeague(LeagueData data)
        {
            if (data == null || string.IsNullOrWhiteSpace(data.name))
            {
                throw new ValidationException("Name is required");
            }

            if (data.name.Trim().Length > NameMaxLength)
            {
                throw new ValidationException($"Name must be {NameMaxLength} characters or fewer");
            }

            if (data.numTrebles < 0 || data.numDoubles < 0 || data.numSingles < 0)
            {
                throw new ValidationException("Number of games cannot be negative");
            }

            if (data.numTrebles == 0 && data.numDoubles == 0 && data.numSingles == 0)
            {
                throw new ValidationException("A league needs at least one game of some type");
            }

            if (data.treblesLegs < 1 || data.doublesLegs < 1 || data.singlesLegs < 1)
            {
                throw new ValidationException("Legs per game must be at least 1");
            }

            if (data.treblesStartScore < 1 || data.doublesStartScore < 1 || data.singlesStartScore < 1)
            {
                throw new ValidationException("Starting scores must be at least 1");
            }

            if (data.maxRounds != null && data.maxRounds < 1)
            {
                throw new ValidationException("Max rounds, if set, must be at least 1");
            }
        }

        /// <summary>
        /// Validate that a league can be deleted: no Season may still reference it.
        /// </summary>
        public static async Task ValidateCanDeleteLeague(Guid leagueId, IDocumentSession session)
        {
            var usedInSeason = await session.Query<Season>()
                .Where(s => s.data.leagueId == leagueId)
                .AnyAsync();
            if (usedInSeason)
            {
                throw new ValidationException("Unable to delete a League that a Season is linked to");
            }
        }
    }
}
