using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    public class PlayerControllerValidatorTests
    {
        [Fact]
        public void ValidateNewPlayer_ValidName_DoesNotThrow()
        {
            var data = new PlayerData { name = "Alice" };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateNewPlayer(data));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateNewPlayer_BlankName_Throws(string? name)
        {
            var data = new PlayerData { name = name! };

            var ex = Assert.Throws<ValidationException>(() => PlayerControllerValidator.ValidateNewPlayer(data));
            Assert.Equal("Name is required", ex.Message);
        }

        [Fact]
        public void ValidateNewPlayer_NameOverMaxLength_Throws()
        {
            var data = new PlayerData { name = new string('a', 101) };

            Assert.Throws<ValidationException>(() => PlayerControllerValidator.ValidateNewPlayer(data));
        }

        [Fact]
        public void ValidateNewPlayer_NameAtMaxLength_DoesNotThrow()
        {
            var data = new PlayerData { name = new string('a', 100) };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateNewPlayer(data));

            Assert.Null(ex);
        }

        [Fact]
        public void ValidateNewPlayer_NameWithSurroundingWhitespace_DoesNotThrow()
        {
            // Trimming happens in the controller before storing; the validator only
            // needs to see that there's real content once whitespace is stripped.
            var data = new PlayerData { name = "  Bob  " };

            var ex = Record.Exception(() => PlayerControllerValidator.ValidateNewPlayer(data));

            Assert.Null(ex);
        }
    }
}
