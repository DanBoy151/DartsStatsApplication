# DartsStatsApplication.Server.Tests

Unit test project for the server. Started in Stage 2 (test harness + CI) and expanded in Stage 3 (validation-logic coverage).

## What's covered

- `GameControllerValidatorTests.cs` — `GameControllerValidator.ValidateSelectedPlayers()` (Stage 2).
- `LegControllerValidatorTests.cs` — `LegControllerValidator.IsValidToCompleteLeg()`: leg-status guard, required result, win/loss score reconciliation against the starting score, and the 1–3 finish-darts rule (Stage 3a).
- `GameCompletionValidatorTests.cs` — `GameControllerValidator.IsValidToStartGame()` and `IsValidToCompleteGame(List<Leg>, CompleteGameData)`: status guards, all-legs-completed, and result-vs-leg-majority consistency (Stage 3b).
- `MatchControllerValidatorTests.cs` — `MatchControllerValidator.IsValidToCompleteMatch(List<Game>)`: all-games-complete, player-of-the-match participation, and a regression guard for the aggregation bug where the games check used to be overwritten by the player check (Stage 3c).

All of the above are unit-testable with a `null` session because the rules were written as pure functions over in-memory data — where a rule needs related records (a game's legs, a match's games), the caller loads them and passes them in.

## What's still intentionally not covered

- `MatchControllerValidator.IsValidToStartMatch()` and `ValidateAvailablePlayers()` query `_documentSession` directly, so testing them properly needs a real Marten/Postgres-backed session (e.g. via Testcontainers). Deferred until/unless database-backed integration tests are added.

## Note on this project's provenance

These files were hand-authored (matching standard `dotnet new xunit` template output and C# conventions) rather than generated/compiled by the .NET CLI, because no `.NET SDK` was available in the environment used to create them. **Run `dotnet test` locally to confirm** — the Stage 3 validation tests in particular have not been executed anywhere yet.
