# DartsStatsApplication.Server.Tests

Unit test project for the server, covering the `Services/Validators` business-rule layer.

## What's covered

- `GameControllerValidatorTests.cs` — `GameControllerValidator.ValidateSelectedPlayers()`.
- `LegControllerValidatorTests.cs` — `LegControllerValidator.IsValidToCompleteLeg()`: leg-status guard, required result, win/loss score reconciliation against the starting score, and the 1–3 finish-darts rule.
- `GameCompletionValidatorTests.cs` — `GameControllerValidator.IsValidToStartGame()` and `IsValidToCompleteGame(List<Leg>, CompleteGameData)`: status guards, all-legs-completed, and result-vs-leg-majority consistency.
- `MatchControllerValidatorTests.cs` —
  - `IsValidToCompleteMatch(List<Game>)`: all-games-complete, player-of-the-match participation, and a regression guard for the aggregation bug where the games check used to be overwritten by the player check.
  - `ValidateNewMatch(MatchData)`: opponent required/max length, date required, and that a newly created match must be `Scheduled`.
- `PlayerControllerValidatorTests.cs` — `PlayerControllerValidator.ValidateNewPlayer(PlayerData)`: name required (including whitespace-only), max length, and that surrounding whitespace doesn't itself fail validation (trimming happens in the controller, after validation).

All of the above are unit-testable with a `null` session because the rules were written as pure functions over in-memory data — where a rule needs related records (a game's legs, a match's games), the caller loads them and passes them in. `ValidateNewMatch` and `ValidateNewPlayer` are `static` for the same reason: they validate submitted data directly, with no existing document or session involved at all.

## What's still intentionally not covered

- `MatchControllerValidator.IsValidToStartMatch()` and `ValidateAvailablePlayers()` query `_documentSession` directly, so testing them properly needs a real Marten/Postgres-backed session (e.g. via Testcontainers). Deferred until/unless database-backed integration tests are added. (The end-to-end `PUT /Match/{id}/start` and `PUT /Match/{id}/update-available-players` flows they guard are covered instead by the Playwright suite in `e2e/`, which runs against a real Postgres.)
