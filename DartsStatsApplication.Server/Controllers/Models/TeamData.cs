namespace DartsStatsApplication.Server.Controllers.Models
{
    /// <summary>
    /// A team - a roster of Players (see PlayerData.teamId) that plays Seasons
    /// (see SeasonData.teamId) within Leagues. A team has no direct League
    /// field of its own - which league(s) it's played in is derived from its
    /// Seasons, since that affiliation is really a per-season fact.
    /// </summary>
    public class TeamData
    {
        public string name { get; set; } = "";
    }
}
