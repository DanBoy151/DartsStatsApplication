using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Models;
using Marten;

namespace DartsStatsApplication.Server.Services.Validators
{
    public static class SeasonControllerValidator
    {
        private const int NameMaxLength = 150;

        /// <summary>
        /// Validate a season's own fields. Pure over the submitted data - the same
        /// rules apply whether this is a new season or an edit.
        /// </summary>
        public static void ValidateNewSeason(SeasonData data)
        {
            if (data == null || string.IsNullOrWhiteSpace(data.name))
            {
                throw new ValidationException("Name is required");
            }

            if (data.name.Trim().Length > NameMaxLength)
            {
                throw new ValidationException($"Name must be {NameMaxLength} characters or fewer");
            }

            if (data.leagueId == Guid.Empty)
            {
                throw new ValidationException("A League must be selected");
            }

            if (data.teamId == Guid.Empty)
            {
                throw new ValidationException("A Team must be selected");
            }
        }

        /// <summary>
        /// Validate that the submitted League and Team actually exist.
        /// </summary>
        public static async Task ValidateLeagueAndTeamExist(SeasonData data, IDocumentSession session)
        {
            var league = await session.LoadAsync<League>(data.leagueId);
            if (league == null)
            {
                throw new ValidationException("Selected League does not exist");
            }

            var team = await session.LoadAsync<Team>(data.teamId);
            if (team == null)
            {
                throw new ValidationException("Selected Team does not exist");
            }
        }

        /// <summary>
        /// A season's League/Team are locked once it has any Matches - changing
        /// either at that point would retroactively change what rules/roster
        /// already-played matches were meant to belong to. The name stays
        /// editable regardless.
        /// </summary>
        public static async Task ValidateCanEditLeagueOrTeam(Season existing, SeasonData data, IDocumentSession session)
        {
            bool changingLeagueOrTeam = data.leagueId != existing.data.leagueId || data.teamId != existing.data.teamId;
            if (!changingLeagueOrTeam) return;

            var hasMatches = await session.Query<Match>()
                .Where(m => m.data.seasonId == existing.Id)
                .AnyAsync();
            if (hasMatches)
            {
                throw new ValidationException("Unable to change the League or Team of a Season that already has Matches");
            }
        }

        /// <summary>
        /// Validate that a season can be deleted: no Match may already be linked to it.
        /// </summary>
        public static async Task ValidateCanDeleteSeason(Guid seasonId, IDocumentSession session)
        {
            var hasMatches = await session.Query<Match>()
                .Where(m => m.data.seasonId == seasonId)
                .AnyAsync();
            if (hasMatches)
            {
                throw new ValidationException("Unable to delete a Season that has Matches linked to it");
            }
        }
    }
}
