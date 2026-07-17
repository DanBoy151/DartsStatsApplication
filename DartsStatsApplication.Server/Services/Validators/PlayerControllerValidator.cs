using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;

namespace DartsStatsApplication.Server.Services.Validators
{
    public static class PlayerControllerValidator
    {
        private const int NameMaxLength = 100;

        /// <summary>
        /// Validate that a new player can be created. Throws on any rule violation.
        /// Pure over the submitted data, so no session/query is needed here.
        /// </summary>
        public static void ValidateNewPlayer(PlayerData data)
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
    }
}
