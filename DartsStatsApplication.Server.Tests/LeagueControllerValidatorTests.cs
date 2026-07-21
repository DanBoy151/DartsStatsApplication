using DartsStatsApplication.Server.Controllers.Models;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Services.Validators;
using Xunit;

namespace DartsStatsApplication.Server.Tests.Services.Validators
{
    // ValidateCanDeleteLeague queries _documentSession directly (to check whether any
    // Season references the league), so - like PlayerControllerValidator.ValidateCanDeletePlayer -
    // it isn't unit-tested here; it's covered by the Playwright suite in e2e/, which runs
    // against a real Postgres. See this project's README.
    public class LeagueControllerValidatorTests
    {
        private static LeagueData ValidLeague() => new LeagueData
        {
            name = "Fooshire League",
            numTrebles = 2,
            numDoubles = 3,
            numSingles = 6,
            treblesLegs = 1,
            doublesLegs = 1,
            singlesLegs = 3,
            treblesStartScore = 701,
            doublesStartScore = 601,
            singlesStartScore = 501,
            maxRounds = 17,
        };

        [Fact]
        public void ValidateLeague_ValidData_DoesNotThrow()
        {
            var ex = Record.Exception(() => LeagueControllerValidator.ValidateLeague(ValidLeague()));
            Assert.Null(ex);
        }

        [Fact]
        public void ValidateLeague_NullMaxRounds_DoesNotThrow()
        {
            var data = ValidLeague();
            data.maxRounds = null;

            var ex = Record.Exception(() => LeagueControllerValidator.ValidateLeague(data));
            Assert.Null(ex);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void ValidateLeague_BlankName_Throws(string? name)
        {
            var data = ValidLeague();
            data.name = name!;

            var ex = Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
            Assert.Equal("Name is required", ex.Message);
        }

        [Fact]
        public void ValidateLeague_NameOverMaxLength_Throws()
        {
            var data = ValidLeague();
            data.name = new string('a', 151);

            Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
        }

        [Theory]
        [InlineData(-1, 3, 6)]
        [InlineData(2, -1, 6)]
        [InlineData(2, 3, -1)]
        public void ValidateLeague_NegativeGameCount_Throws(int trebles, int doubles, int singles)
        {
            var data = ValidLeague();
            data.numTrebles = trebles;
            data.numDoubles = doubles;
            data.numSingles = singles;

            Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
        }

        [Fact]
        public void ValidateLeague_AllGameCountsZero_Throws()
        {
            var data = ValidLeague();
            data.numTrebles = 0;
            data.numDoubles = 0;
            data.numSingles = 0;

            var ex = Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
            Assert.Equal("A league needs at least one game of some type", ex.Message);
        }

        [Fact]
        public void ValidateLeague_OnlyOneGameTypeConfigured_DoesNotThrow()
        {
            var data = ValidLeague();
            data.numTrebles = 0;
            data.numDoubles = 0;
            data.numSingles = 6;

            var ex = Record.Exception(() => LeagueControllerValidator.ValidateLeague(data));
            Assert.Null(ex);
        }

        [Theory]
        [InlineData(0, 1, 1)]
        [InlineData(1, 0, 1)]
        [InlineData(1, 1, 0)]
        public void ValidateLeague_LegsPerGameBelowOne_Throws(int treblesLegs, int doublesLegs, int singlesLegs)
        {
            var data = ValidLeague();
            data.treblesLegs = treblesLegs;
            data.doublesLegs = doublesLegs;
            data.singlesLegs = singlesLegs;

            Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
        }

        [Theory]
        [InlineData(0, 601, 501)]
        [InlineData(701, 0, 501)]
        [InlineData(701, 601, 0)]
        public void ValidateLeague_StartingScoreBelowOne_Throws(int treblesScore, int doublesScore, int singlesScore)
        {
            var data = ValidLeague();
            data.treblesStartScore = treblesScore;
            data.doublesStartScore = doublesScore;
            data.singlesStartScore = singlesScore;

            Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
        }

        [Fact]
        public void ValidateLeague_MaxRoundsBelowOne_Throws()
        {
            var data = ValidLeague();
            data.maxRounds = 0;

            Assert.Throws<ValidationException>(() => LeagueControllerValidator.ValidateLeague(data));
        }
    }
}
