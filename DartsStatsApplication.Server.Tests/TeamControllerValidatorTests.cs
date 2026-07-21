using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // ValidateCanDeleteTeam queries _documentSession directly (to check whether any
    // Player or Season references the team), so - like PlayerControllerValidator.ValidateCanDeletePlayer -
    // it isn't unit-tested here; it's covered by the Playwright suite in e2e/, which runs
    // against a real Postgres. See this project's README.
    public class TeamControllerValidatorTests
    {
        [Fact]
        public void ValidateName_ValidName_DoesNotThrow()
        {
            var data = new TeamData { name = "A Team" };

            var ex = Record.Exception(() => TeamControllerValidator.ValidateName(data));

            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateName_BlankName_Throws(string? name)
        {
            var data = new TeamData { name = name! };

            var ex = Assert.Throws<ValidationException>(() => TeamControllerValidator.ValidateName(data));
            Assert.Equal("Name is required", ex.Message);
        }

        [Fact]
        public void ValidateName_NameOverMaxLength_Throws()
        {
            var data = new TeamData { name = new string('a', 151) };

            Assert.Throws<ValidationException>(() => TeamControllerValidator.ValidateName(data));
        }

        [Fact]
        public void ValidateName_NameAtMaxLength_DoesNotThrow()
        {
            var data = new TeamData { name = new string('a', 150) };

            var ex = Record.Exception(() => TeamControllerValidator.ValidateName(data));

            Assert.Null(ex);
        }
    }
}
