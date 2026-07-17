using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // ValidateCanDeletePlayer queries _documentSession directly (to check whether the player
    // is referenced by any Match/Game), so - like MatchControllerValidator.IsValidToStartMatch
    // and ValidateAvailablePlayers - it isn't unit-tested here; it's covered by the Playwright
    // suite in e2e/, which runs against a real Postgres. See this project's README.
    public class PlayerControllerValidatorTests
    {
        [Fact]
        public void ValidateName_ValidName_DoesNotThrow()
        {
            var data = new PlayerData { name = "Alice" };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateName(data));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateName_BlankName_Throws(string? name)
        {
            var data = new PlayerData { name = name! };

            var ex = Assert.Throws<ValidationException>(() => PlayerControllerValidator.ValidateName(data));
            Assert.Equal("Name is required", ex.Message);
        }

        [Fact]
        public void ValidateName_NameOverMaxLength_Throws()
        {
            var data = new PlayerData { name = new string('a', 101) };

            Assert.Throws<ValidationException>(() => PlayerControllerValidator.ValidateName(data));
        }

        [Fact]
        public void ValidateName_NameAtMaxLength_DoesNotThrow()
        {
            var data = new PlayerData { name = new string('a', 100) };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateName(data));

            Assert.Null(ex);
        }

        [Fact]
        public void ValidateName_NameWithSurroundingWhitespace_DoesNotThrow()
        {
            // Trimming happens in the controller before storing; the validator only
            // needs to see that there's real content once whitespace is stripped.
            var data = new PlayerData { name = "  Bob  " };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateName(data));

            Assert.Null(ex);
        }
    }
}
