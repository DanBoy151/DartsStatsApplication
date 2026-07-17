# DartsStatsApplication.Server.Tests

Unit test project for the server, covering the `Services/Validators` business-rule layer.

## What's covered

- `GameControllerValidatorTests.cs` — `GameControllerValidator.ValidateSelectedPlayers()`.
- `LegControllerValidatorTests.cs` — `LegControllerValidator.IsValidToCompleteLeg()`: leg-status guard, required result, win/loss score reconciliation against the starting score, and the 1–3 finish-darts rule.
- `GameCompletionValidatorTests.cs` — `GameControllerValidator.IsValidToStartGame()` and `IsValidToCompleteGame(List<Leg>, CompleteGameData)`: status guards, all-legs-completed, and result-vs-leg-majority consistency.
- `MatchControllerValidatorTests.cs` —
  - `IsValidToCompleteMatch(List<Game>)`: all-games-complete, player-of-the-match participation, and a regression guard for the aggregation bug where the games check used to be overwritten by the player check.
  - `ValidateNewMatch(MatchData)`: opponent required/max length, date required, and that a newly created match must be `Scheduled`.
  - `ValidateEditMatch(Match, MatchData)`: only a Scheduled match is editable, plus the same opponent/date checks as create.
  - `ValidateCanDeleteMatch(Match)`: only a Scheduled match can be deleted.
- `PlayerControllerValidatorTests.cs` — `PlayerControllerValidator.ValidateName(PlayerData)` (shared by create and rename): name required (including whitespace-only), max length, and that surrounding whitespace doesn't itself fail validation (trimming happens in the controller, after validation).

All of the above are unit-testable with a `null` session because the rules were written as pure functions over in-memory data — where a rule needs related records (a game's legs, a match's games), or an existing document (the match being edited/deleted), the caller loads it and passes it in. `ValidateNewMatch`, `ValidateEditMatch`, `ValidateCanDeleteMatch`, and `ValidateName` are `static` for the same reason: no session involved at all.

## What's still intentionally not covered

- `MatchControllerValidator.IsValidToStartMatch()` and `ValidateAvailablePlayers()`, and `PlayerControllerValidator.ValidateCanDeletePlayer()`, query `_documentSession` directly, so testing them properly needs a real Marten/Postgres-backed session (e.g. via Testcontainers). Deferred until/unless database-backed integration tests are added. (The end-to-end flows they guard - starting a match, setting its roster, deleting a player - are covered instead by the Playwright suite in `e2e/`, which runs against a real Postgres.)
- Likewise, `MatchService.CompleteMatch()` and `GameService.CompleteGame()` load their match's games / game's legs via a direct `_documentSession.Query(...)` before handing off to the (separately unit-tested) pure validator - so the loading itself needs a real session too, and is covered by `e2e/` instead. This is also where the "Marten 9 requires async data access" bug class has repeatedly shown up (`MatchController.GetNextMatch`, `MatchControllerValidator.IsValidToStartMatch`/`ValidateAvailablePlayers`, `MatchService.CompleteMatch`, `GameService.CompleteGame` - see `e2e/BUGS.md`): a synchronous `.ToList()`/`.FirstOrDefault()` directly on a Marten `IQueryable` compiles fine but throws `NotSupportedException` at runtime, and nothing in this project catches that class of mistake before it reaches a real database. Worth keeping an eye out for the same pattern in any new session-querying code.
