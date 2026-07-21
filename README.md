# DartsStatsApplication

A stats-tracking app for a darts team: records matches against opposition teams, the games and legs played within each match, and each player's results - optionally organised into Leagues/Teams/Seasons with their own rules (game counts, legs, starting scores, a round limit before a bull-off decides a leg). Built as an ASP.NET Core API backed by a Postgres document store, with a Vue 3 frontend for running a match live (player selection, scoring with dartboard-legality validation, leg/game/match completion) and for managing rosters/fixtures and browsing team- and player-level statistics.

## Tech stack

- **Server**: ASP.NET Core 9 Web API, [Marten](https://martendb.io/) (document database on top of Postgres), NSwag for OpenAPI/Swagger.
- **Client**: Vue 3 + TypeScript + Vite, Pinia for state (with `pinia-plugin-persistedstate` so in-progress match state survives a refresh). No router yet - top-level navigation between the main app, the Manage forms, and the Statistics screens is a small piece of state (`currentView`) in `App.vue`.
- **Database**: Postgres (run via Docker in local dev).
- **Tests**:
  - xUnit (`DartsStatsApplication.Server.Tests`) for the server's validation/business-rule layer.
  - Vitest (`dartsstatsapplication.client`) for client-side pure logic (Pinia store behaviour, form validation helpers).
  - Playwright (`e2e/`) for full end-to-end coverage of critical user journeys, run against an isolated Docker stack.

## Project structure

```
DartsStatsApplication.Server/         ASP.NET Core API
  Controllers/                        MatchController, GameController, LegController, PlayerController,
                                       LeagueController, TeamController, SeasonController
  Controllers/Models/                 Request/wire-shape DTOs (MatchData, GameData, LegData, PlayerData,
                                       LeagueData, TeamData, SeasonData, PlayerStatsData, PlayerFormData)
  Models/                             Document models + enums (Match, Game, Leg, Player, League, Team,
                                       Season + their statuses)
  Services/                           MatchService, GameService, LegService - controllers delegate all
                                       state mutation here rather than touching documents directly.
                                       PlayerStatsCalculator, SeasonStatusCalculator, PlayerFormCalculator
                                       and DartScoring are pure, session-free helpers used by both the
                                       controllers and the validators below
  Services/Validators/                One *ControllerValidator per aggregate, enforcing business rules
                                       (e.g. a leg's score must reconcile to its starting score and be
                                       achievable with real darts to complete it, a new match must be
                                       created as Scheduled, a league can't be deleted while a season
                                       still links to it)
  Middleware/                         ApiKeyMiddleware - optional API key gate, off by default
  Exceptions/                         ValidationException + the global ApiExceptionHandler that turns it
                                       (and anything else) into a consistent ProblemDetails response

DartsStatsApplication.Server.Tests/   xUnit tests for the validator/calculator layer (see its own README)

dartsstatsapplication.client/         Vue 3 + Vite frontend
  src/actions/                        apiClient.ts (shared fetch wrapper) + one *Service.ts per aggregate
  src/models/                         App-level models plus the Raw* wire-shape interfaces the services
                                       parse; dartScoring.ts / gameProgress.ts are pure scoring-logic helpers
  src/stores/                         Pinia store for in-progress match state (+ its Vitest tests)
  src/validation/                     Pure, unit-tested client-side validation helpers for the Manage forms -
                                       a UX convenience, not a substitute for the server's own validation,
                                       which is authoritative
  src/components/                     MatchControl / MatchCenter component tree for running a live match
                                       (scoring, checkout/bull-off prompts, editing players while Ready)
  src/components/Manage/              NewPlayerForm.vue / NewMatchForm.vue / NewLeagueForm.vue /
                                       NewTeamForm.vue / NewSeasonForm.vue - reached via the menu bar's
                                       Manage dropdown
  src/components/Statistics/          TeamStatistics.vue (leaderboard, team/season filters) and
                                       PlayerStatistics.vue (one player's Overall/Singles/Doubles/Trebles
                                       stats, per-section season filters, current-form trend)

e2e/                                  Playwright end-to-end suite (Page Object Model) - see its own README
  pages/                              One class per screen/component, selectors isolated from test logic
  fixtures/                           Custom test() wiring up page objects + API-seeded test data
  support/                            Docker stack lifecycle (global setup/teardown) + shared config
  tests/                              Specs, numbered where file execution order matters (see comments)

docker-compose.yml                    Client + Server + Postgres, wired together for local Docker use
docker-compose.e2e.yml                Isolated copy of the same stack (own ports, ephemeral Postgres) used
                                       only by the e2e/ suite, so it never touches your local dev database
```

## Running it

### With Docker (recommended)

This brings up Postgres, the API, and the client together:

```sh
docker-compose up --build
```

- Client: http://localhost
- API: http://localhost:5001 (Swagger UI at `/swagger`)
- Postgres: exposed on `localhost:54320` (maps to the container's `5432`) if you want to connect a DB tool directly

The server's connection string in this mode comes from `docker-compose.yml`'s `ConnectionStrings__Database` environment variable, not from `appsettings.json`.

### Running server and client separately (no Docker)

Useful for day-to-day development with hot reload / debugging.

**Postgres**: the easiest option is still to let Docker run just the database:

```sh
docker-compose up postgresdb
```

**Server**:

```sh
cd DartsStatsApplication.Server
dotnet run
```

Runs against `appsettings.Development.json`'s connection string, which points at `localhost:54320` (the Postgres container above) with the `postgres`/`postgres` credentials docker-compose seeds. Marten auto-creates the schema on startup.

**Client**:

```sh
cd dartsstatsapplication.client
npm install
npm run dev
```

Runs on http://localhost:53004 by default (see `vite.config.ts`) and talks to the API at whatever `VITE_API_BASE_URL` is set to in `.env.development` (currently `http://localhost:5001`, i.e. the Docker-run server's exposed port — point the server's own launch profile or `.env.development` at each other if you want a fully non-Docker loop).

## Configuration

- **Connection strings**: `appsettings.json` intentionally ships with an empty `ConnectionStrings:Database` - each environment supplies its own. `appsettings.Development.json` has a working local one; `docker-compose.yml` overrides it via env var for the Docker path; `appsettings.Production.json` is a placeholder (real values belong in environment variables or a secrets manager at actual deploy time, never committed).
- **CORS**: allowed origins come from the `Cors:AllowedOrigins` config section (see `appsettings.Development.json`) rather than being hardcoded, so each environment can declare its own client origin(s).
- **API key gate**: `Middleware/ApiKeyMiddleware.cs` checks requests against `ApiSecurity:ApiKey` when it's set. It's empty everywhere by default, so this is a no-op until you opt in. To turn it on locally without committing a real key:

  ```sh
  dotnet user-secrets set "ApiSecurity:ApiKey" "some-value" --project DartsStatsApplication.Server
  ```

  and set the same value as `VITE_API_KEY` for the client (`apiClient.ts` sends it as an `X-Api-Key` header automatically when present).

## Running tests

**Server** (xUnit):

```sh
cd DartsStatsApplication.Server.Tests
dotnet test
```

See that project's own `README.md` for what's covered and what's intentionally deferred.

**Client unit tests** (Vitest - Pinia store logic, form validation helpers):

```sh
cd dartsstatsapplication.client
npm run test:unit
```

**Client build/lint**:

```sh
cd dartsstatsapplication.client
npm run lint          # ESLint
npm run build          # type-check (vue-tsc) + production build
```

**End-to-end** (Playwright, against an isolated Docker stack - see `e2e/README.md`):

```sh
cd e2e
npm install
npx playwright install --with-deps chromium   # first time only
npm test
```

A single `npm test` builds and boots `docker-compose.e2e.yml` (its own Postgres/API/client, own ports, ephemeral data), runs the suite, and tears the stack back down - it never touches whatever you might already have running via `docker-compose.yml`.

All four (server tests, client build/lint, client unit tests, E2E) run in CI on every push/PR to `master` (`.github/workflows/ci.yml`), each as its own job.

## Domain model

- **Player** — just a name and an optional `teamId`; players are shared across matches. Created via Manage → New Player (or `POST /api/Player` directly); name is required and capped at 100 characters. Can't be deleted once they've appeared in a Match or Game.
- **Team** — a roster of Players that plays Seasons within Leagues. Has no direct League field of its own - which league(s) it's played in is derived from its Seasons. Can't be deleted while a Player still belongs to it.
- **League** — a configurable ruleset: how many Singles/Doubles/Trebles games a match has, how many legs each is played to, their starting scores, and an optional round limit (`maxRounds`) before a leg is decided by a bull-off instead of normal scoring. Can't be deleted while a Season still links to it.
- **Season** — one Team's campaign in one League for a period; a series of Matches played under that League's rules. Its status (`Active`/`Closed`) is computed, never stored - `Closed` once every linked Match is `Completed`. Can't be deleted while a Match still links to it, and its League/Team can no longer be changed once a Match does.
- **Match** — a fixture against an opposition team, with a location, date, status (`Scheduled` → `Ready` → `InProgress` → `Completed`), and an optional `seasonId`. Tracks `gamesFor`/`gamesAgainst` and a player of the match. Created via Manage → New Match (or `POST /api/Match`); opponent and date are required, and a newly created match must be `Scheduled` - the server rejects any attempt to create one that's already further along, so the normal start → roster → play lifecycle can't be skipped. Only one Match can be `InProgress` at a time.
- **Game** — one of the games within a Match: `Singles` (1 own player), `Doubles` (2), or `Trebles` (3). How many of each type a Match has, how many legs they're played to, and their starting score are resolved once from the Match's League at creation time (or today's hardcoded 3 legs/501 Singles, 1 leg/601 Doubles, 1 leg/701 Trebles when there's no League) and stamped onto the Game as an immutable snapshot. Status moves `Pending` → `Ready` (players selected - can still be changed right up until the game starts) → `InProgress` → `Complete`.
- **Leg** — a single leg of darts within a Game, counting down from the Game's starting score to zero. Status moves `Pending` → `Started` → `Completed`. Legs are created one at a time as they're actually needed (not all upfront), so a Singles game decided 2-0 never leaves an unplayed 3rd Leg document behind. Completing a leg validates that the submitted score history reconciles to the starting score, that every individual visit is a score achievable with real darts, and - for a checkout - that the finishing visit can end on a double. Past a League's configured `maxRounds`, a leg that isn't a genuine checkout is resolved either as a scorer-confirmed loss (the opponent checked out first) or, if neither side finished, by a bull-off (`PUT /Leg/{id}/complete-bull-off`).

All state transitions are enforced by the `Services/Validators` layer and surfaced to API callers as a 400 with a readable message (via `ValidationException` + the global exception handler) rather than a raw exception or a silent no-op. The client mirrors the simple field-level checks (required, max length, dartboard-achievable scores) for instant feedback, but the server's validation is what's actually authoritative.

### Statistics

- **Team Statistics** — a leaderboard of every player's career stats (legs played/won/lost, win%, 3-dart average, first-9 average, 100+/140+/180 counts, highest checkout, best leg), computed by the pure `PlayerStatsCalculator`. Optionally filtered to one team and one of that team's seasons.
- **Player Statistics** — one player's stats broken into Overall/Singles/Doubles/Trebles sections, each independently filterable to a season, plus a "current form" panel: their last 5 completed Singles games, the pooled average across them versus their career Singles average, and a trend (`Increasing`/`Decreasing`/`Steady`) from `PlayerFormCalculator`. Reachable from the menu or by clicking a player's name on Team Statistics.

## API overview

All routes are under `/api/`. Full interactive docs (and a way to try requests) are at `/swagger` when the server is running.

| Resource | Key routes |
|---|---|
| `Player` | `GET /Player`, `GET /Player/{id}`, `GET /Player/stats` (every player's career stats), `GET /Player/{id}/stats?seasonId=&gameType=`, `GET /Player/{id}/seasons`, `GET /Player/{id}/form`, `POST /Player`, `PUT /Player/{id}`, `DELETE /Player/{id}` |
| `Team` | `GET /Team`, `GET /Team/{id}`, `GET /Team/{id}/seasons`, `GET /Team/{id}/stats?seasonId=`, `POST /Team`, `PUT /Team/{id}`, `DELETE /Team/{id}` |
| `League` | `GET /League`, `GET /League/{id}`, `POST /League`, `PUT /League/{id}`, `DELETE /League/{id}` |
| `Season` | `GET /Season`, `GET /Season/{id}`, `POST /Season`, `PUT /Season/{id}`, `DELETE /Season/{id}` |
| `Match` | `GET /Match/matches`, `GET /Match/{id}`, `GET /Match/next`, `GET /Match/{id}/games`, `POST /Match`, `PUT /Match/{id}`, `DELETE /Match/{id}`, `PUT /Match/{id}/start`, `PUT /Match/{id}/update-available-players`, `PUT /Match/{id}/complete`, `PUT /Match/{id}/update-match-score` |
| `Game` | `GET /Game`, `GET /Game/{id}`, `GET /Game/{id}/legs`, `POST /Game`, `POST /Game/{id}/legs` (create the next leg on demand), `PUT /Game/{id}/update-players`, `PUT /Game/{id}/start`, `PUT /Game/{id}/complete` |
| `Leg` | `GET /Leg`, `GET /Leg/{id}`, `POST /Leg`, `PUT /Leg/{id}/start`, `PUT /Leg/{id}/complete`, `PUT /Leg/{id}/complete-bull-off` |

The list endpoints (`GET /Player`, `/Game`, `/Leg`, `/Match/matches`) accept optional `skip`/`take` query parameters (default `take=100`, capped at 500).
