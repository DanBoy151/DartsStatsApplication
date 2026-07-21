using System;
using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // ValidateLeagueAndTeamExist / ValidateCanEditLeagueOrTeam / ValidateCanDeleteSeason all
    // query _documentSession directly, so - like PlayerControllerValidator.ValidateCanDeletePlayer -
    // they aren't unit-tested here; they're covered by the Playwright suite in e2e/, which runs
    // against a real Postgres. See this project's README. Only the pure ValidateNewSeason
    // (shape-only checks) is covered here.
    public class SeasonControllerValidatorTests
    {
        private static SeasonData ValidSeason() => new SeasonData
        {
            name = "2026 Autumn",
            leagueId = Guid.NewGuid(),
            teamId = Guid.NewGuid(),
        };

        [Fact]
        public void ValidateNewSeason_ValidData_DoesNotThrow()
        {
            var ex = Record.Exception(() => SeasonControllerValidator.ValidateNewSeason(ValidSeason()));
            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateNewSeason_BlankName_Throws(string? name)
        {
            var data = ValidSeason();
            data.name = name!;

            var ex = Assert.Throws<ValidationException>(() => SeasonControllerValidator.ValidateNewSeason(data));
            Assert.Equal("Name is required", ex.Message);
        }

        [Fact]
        public void ValidateNewSeason_NameOverMaxLength_Throws()
        {
            var data = ValidSeason();
            data.name = new string('a', 151);

            Assert.Throws<ValidationException>(() => SeasonControllerValidator.ValidateNewSeason(data));
        }

        [Fact]
        public void ValidateNewSeason_EmptyLeagueId_Throws()
        {
            var data = ValidSeason();
            data.leagueId = Guid.Empty;

            var ex = Assert.Throws<ValidationException>(() => SeasonControllerValidator.ValidateNewSeason(data));
            Assert.Equal("A League must be selected", ex.Message);
        }

        [Fact]
        public void ValidateNewSeason_EmptyTeamId_Throws()
        {
            var data = ValidSeason();
            data.teamId = Guid.Empty;

            var ex = Assert.Throws<ValidationException>(() => SeasonControllerValidator.ValidateNewSeason(data));
            Assert.Equal("A Team must be selected", ex.Message);
        }
    }
}
