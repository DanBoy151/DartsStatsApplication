# Findings from building the E2E suite

Discovered while implementing Playwright coverage of the "start next match"
critical path (see `tests/start-next-match.spec.ts`). Grouped by what was
done about them.

## Fixed

### 1. `PUT /Match/{id}/start` and `PUT /Match/{id}/update-available-players` crashed with a 500
`MatchControllerValidator.IsValidToStartMatch()` and `.ValidateAvailablePlayers()`
(`DartsStatsApplication.Server/Services/Validators/MatchControllerValidator.cs`)
called Marten's `IQueryable` synchronously (`.FirstOrDefault()` / `.First()`).
Marten 9 dropped synchronous data access, so both threw
`NotSupportedException`, turned into a generic 500 by `ApiExceptionHandler`.
In practice: clicking **Play Match** or **Proceed** (available players) on a
freshly-seeded match crashed the server outright. Fixed by making both
methods `async Task` and awaiting `FirstOrDefaultAsync()`, with callers in
`MatchService.cs` and `MatchController.cs` updated to `await` them. Same bug
family as the `GET /api/Match/next` 500 fixed earlier this session in
`MatchController.GetNextMatch` / `GameController.GetGameLegs`.
Covered end-to-end by `tests/start-next-match.spec.ts`.

### 2. `docker-compose.yml` client build context had the wrong case
`context: ./DartsStatsApplication.Client/` pointed at a directory that's
actually named `dartsstatsapplication.client` (all lowercase, per `git
ls-files`). Windows/macOS filesystems hide this; Linux does not - so `docker
compose build` would fail on any Linux CI runner or Linux host. Fixed by
correcting the casing.

### 3. `PUT /Match/{id}/complete` had the same sync-Marten-query bug
`MatchService.CompleteMatch()` ran
`_documentSession.Query<Game>().Where(g => g.data.matchId == _match.Id).ToList()`
directly on the Marten `IQueryable` - no `await`, no `ToListAsync()`. Same
`NotSupportedException` → 500 as issue #1, the first time anyone tried to
complete a match. Fixed the same way (`await ... .ToListAsync()`, with
`MatchService.CompleteMatch` and its `MatchController` caller made `async`).
`ToListAsync()` returns `IReadOnlyList<Game>`, not `List<Game>`, so the
result is materialized with a plain (in-memory, not Marten) `.ToList()` to
satisfy `IsValidToCompleteMatch(List<Game>)`.
Covered by an API-level test in `tests/start-next-match.spec.ts` ("completing
a match reaches validation instead of crashing") - it deliberately never
calls `start()`, since `CompleteMatch` doesn't check match status, so a
freshly-created Scheduled match with zero games is enough to exercise the
query and reach the "no games" validation error instead of crashing.

### 4. Refreshing the page mid-match discarded all local progress
`MainContent.vue`'s `onMounted` called `matchDataStore.clearStore()`
unconditionally via `resetMatchDataStore()`, even though the store is
`persist: true` and has a purpose-built `resetStore()` that only clears data
older than 6 hours - but nothing ever called `resetStore()`. Fixed by
switching the call. While wiring that in, also fixed a real bug inside
`resetStore()` itself: it computed the expiry with
`this.memDateTime.setHours(this.memDateTime.getHours() + 6)`, and
`Date.setHours` mutates in place - so every call that *didn't* expire the
store silently pushed `memDateTime` 6 hours further into the future. Fixed
by cloning the date before mutating it.
Covered by `dartsstatsapplication.client/src/stores/__tests__/matchDataStore.spec.ts`
(Vitest unit tests: no-op when `memDateTime` is unset, match data survives
and `memDateTime` is left untouched within the 6-hour window, match data
clears past it) and by a step in the E2E critical-path test that reloads the
page mid-flow and asserts the fetched match is still shown.

### 5. "No next match" looked identical to a server error
The bug reported at the start of this session
(`Request to api/Match/next failed: 404 Not Found`). `apiClient.ts`'s
`request()` treats every non-2xx response as an error, but a 404 from
`GET /api/Match/next` is a legitimate, expected state (nothing scheduled
yet) - e.g. on first launch of a fresh install. Fixed in two parts:
`MatchService.ts`'s `getNextMatch()` now recognises a 404 specifically and
calls `matchDataStore.clearError()` instead of leaving the toast up; and
`LaunchCaptainControl.vue` now shows a "No match scheduled" message in place
of the "Next Match: ..." line instead of just silently omitting it.
Covered by the first test in `tests/start-next-match.spec.ts`, which now
asserts the friendly message and asserts no error toast appears (previously
this test asserted the *bug's* behaviour, as a deliberate characterization -
now it asserts the fix).

### 6. Race condition when confirming available players
`AvailablePlayersControl.vue`'s `proceed()` called `setAvailablePlayers()`
without `await`, immediately emitting `'proceed'` and navigating to the
holding screen before the `PUT /update-available-players` request resolved.
Fixed by awaiting it.
Covered by a step in the E2E critical-path test that gates the PUT response
behind a manually-controlled promise and asserts the holding screen does
*not* appear while the request is still in flight, only after it resolves.

### 8. Dead `error` ref in `MainContent.vue`
`const error = ref(false)` was declared and rendered (`v-if="error"` /
`.error-message`), but nothing ever set it - the real error surface is
`ErrorToast.vue`, reading `matchDataStore.lastError`. Removed the dead ref,
template block, and now-unused `.error-message` style.
Covered by an assertion in `tests/start-next-match.spec.ts` that
`.error-message` never renders.

### 9. Holding screen's "Back" button label was ambiguous
`HoldingScreenControl.vue`'s button was labelled "Back" but returns to the
Available Players screen specifically, not "wherever you came from". On
investigation the *navigation* is correct by design - Available Players and
Pick Game are the two linear steps before play begins, and there's no other
meaningful "one level up" destination from the holding screen. Resolved by
relabeling the button "Back to Players" rather than changing behavior, since
the ambiguity was in the label, not the logic.
Covered by a step in the E2E critical-path test that clicks "Back to
Players", confirms the roster screen reappears with the earlier selections
intact, then re-proceeds back to the holding screen.

### 10. `PUT /Game/{id}/complete` had the same sync-Marten-query bug
Same bug class as #1 and #3, reported directly by the user this time
("complete game triggers async marten error"). `GameService.CompleteGame()`
ran `_documentSession.Query<Leg>().Where(l => l.data.gameID == _game.Id).ToList()`
directly on the Marten `IQueryable` - no `await`, no `ToListAsync()` - so
completing any game crashed with a 500 before ever reaching
`IsValidToCompleteGame`'s validation (which was already correct and already
unit-tested; the bug was purely in the query that loads the game's legs
for it). Fixed the same way: `await ... .ToListAsync()` materialized with an
in-memory `.ToList()`, `GameService.CompleteGame` and its `GameController`
caller made `async`. A full manual walkthrough (create match → start →
select a Singles game's player → start the game → play and complete all 3
legs → complete the game) was run against the isolated e2e stack to confirm
the whole chain works, not just the crash site.
Covered by an API-level step within the critical-path test in
`tests/01-start-next-match.spec.ts` ("completing a game reaches validation
instead of crashing") - reuses that test's own match/games (already In
Progress) rather than creating a new one, since only one match can be In
Progress at a time and a second one here would just 400 on `start()`. Calls
complete on one of its still-Pending games, enough to exercise the query and
reach the "not In Progress" validation error instead of needing to play out
any legs.

At this point this bug class (a synchronous Marten call that compiles fine
but throws `NotSupportedException` under Marten 9) has shown up four times
across this project - #1 (x2), #3, and this one - always in code written
before the Marten 9 upgrade and never exercised against a real database
until now. See `DartsStatsApplication.Server.Tests/README.md` for where the
remaining session-querying code that still isn't unit-tested lives, in case
the same mistake is lurking there too.

### 11. Completing a game left the game summary panel blank
Reported directly by the user ("completing a game causes a bug where the
game summary panel ends up blank"). Root cause was in `matchDataStore.ts`:
`setMatchData()` unconditionally reset `this.match.games` to `[]` on every
call - including the one `MatchService.ts`'s `updateMatchScore()` makes right
after `MatchCenter.vue`'s `finishGame()` completes a game, which is exactly
what wiped the list `GameSummaryPanel.vue` renders. Fixed by only resetting
`games` when switching to a genuinely different match (`matchId` differs);
an update for the same match now preserves whatever was already loaded.

While tracing the actual `finishGame()` call sequence to reproduce this,
found two more bugs in the same store, both from the same pattern as
#9 - a `doneWithSelected*()` method blindly overwriting an array entry with
a stale reference instead of the fresh data another action had *just*
written:
- `doneWithSelectedGame()` overwrote `match.games[i]` (correctly updated to
  `Complete`/`Win` moments earlier by `completeGame()`'s `setGameData()`
  call) with the stale `selectedGame` object, reverting the just-completed
  game's displayed status back to `InProgress`. Fixed to merge: keep the
  status/result `setGameData()` already wrote, take only `legs` (which
  `setGameData()` can't carry - it's client-only state) from `selectedGame`.
- `doneWithSelectedLeg()` did the same thing to `game.legs[i]` after
  completing a leg. Unlike the game case there's nothing worth preserving
  from `selectedLeg` here - `setLegData()`'s fresh data already has
  everything (status/score/result/finishDarts all come straight from the
  server response) - so this one is simply not needed and was removed
  (just clears `selectedLeg` now).

Verified with a full Playwright-driven browser walkthrough against the
isolated e2e stack (start a match, select a Doubles game, assign players,
start it, enter throws to check out, confirm the finish, and check the
summary panel afterwards) - not just a store-level check, since the bug was
about what actually renders.
Covered by `dartsstatsapplication.client/src/stores/__tests__/matchDataStore.spec.ts`
(`setMatchData`, `doneWithSelectedGame`, `doneWithSelectedLeg` describe
blocks) and by a step in the critical-path E2E test that plays a Doubles
game through to completion and asserts the panel still shows all 11 games,
with the completed one showing `Complete`.

### 12. Completing a game could 400 with "Legs that are not Completed"
Found while verifying #11's fix in a real browser - even after the panel
stopped going blank, completing a game still failed. `MatchCenter.vue`'s
`onFinishLeg()` called `completeLeg()` without `await`, so `finishGame()` -
which calls `completeGame()` and validates every leg is `Completed` - could
run before the leg's own `PUT /Leg/{id}/complete` had actually persisted
server-side. Same bug class as #6 (`AvailablePlayersControl.proceed()`).
Fixed by awaiting it.
Covered by the same E2E step as #11 - this race is exactly what made that
step flaky/failing before the fix.

### 13. `LegController.CompleteLeg` returned the wrong object
Found immediately after fixing #12, which surfaced a *different* 400:
`"Game result 'Loss' does not match the Leg outcomes (Wins: 1, Losses: 0)"` -
the server had the leg correctly recorded as a Win, but the client sent
`Loss`. `LegController.cs`'s `complete` action returned `Ok(leg)` - the
request DTO (`CompleteLegData`, which only has `score`/`result`/
`finishDarts`) - instead of `Ok(existLeg)`, the actual updated `Leg`
document. The client's `completeLeg()` reads `data.data?.gameID` from that
response to resync the leg into `matchDataStore`'s `game.legs` array; since
the DTO has no `data.gameID` at all, that call was a silent no-op, so
`game.legs` never saw the real result. `MatchCenter.vue`'s win/loss tally
reads `matchDataStore.selectedGame.legs` (not the leg directly), so it
computed the count from stale, pre-completion data and sent the wrong
result to `completeGame()`. Fixed by returning `existLeg`.
Covered by the same E2E step as #11 - this mismatch is what the step caught
next, after #12 was fixed.

### 15. A mathematically-decided game could never actually complete
Part of implementing the "Finish leg / complete game" flow: a best-of-3
Singles game won or lost 2-0 should complete immediately (the 3rd leg is
pointless), but `PUT /Game/{id}/complete` always 400'd with `"Unable to
complete a Game while it has Legs that are not Completed"`.
`GameControllerValidator.IsValidToCompleteGame()`
(`DartsStatsApplication.Server/Services/Validators/GameControllerValidator.cs`)
required literally every leg to be `Completed`, with no allowance for a leg
that's staying `Pending` forever because the outcome no longer depends on it.
The client's `isGameDecided()` helper (`gameProgress.ts`) already knew the
game was over and called `completeGame()` accordingly - the server just
rejected it. Fixed by extending the check: a game can complete once either
every leg is `Completed`, *or* one side already has enough leg wins/losses
(`>= ceil(totalLegs / 2)`) that the remaining `Pending` legs can't change the
result - matching the client's `legsRequiredToWin()` semantics exactly.
Found via a real-browser walkthrough (Playwright script driving the UI
end-to-end against the isolated e2e stack, with network/console logging) after
this exact scenario failed inside the E2E critical-path test.
Covered by `DartsStatsApplication.Server.Tests/GameCompletionValidatorTests.cs`
(`IsValidToCompleteGame_SinglesDecidedTwoNilWithPendingThirdLeg_DoesNotThrow`,
`IsValidToCompleteGame_SinglesOneAllWithThirdLegPending_Throws`) and by a step
in `tests/01-start-next-match.spec.ts` ("a best-of-3 Singles game finishes
early once the outcome is mathematically decided").

### 16. Leaving a leg mid-play (Back) and reopening it lost all progress
Same root cause family as #11/#12/#13: `matchDataStore.ts`'s `setLegData()`
already resyncs `selectedGame` when a server response replaces the matching
entry in `match.games[].legs[]`, but never did the same for `selectedLeg`.
`MatchCenter.vue`'s `startNextLeg()` (and `onStartMatch()`) calls
`setSelectedLeg(legId)` and *then* awaits `startLeg()` - whose response
triggers `setLegData()`, which replaces that leg's object in `game.legs[]`
with a fresh one. `selectedLeg` is left pointing at the orphaned pre-start
copy. Every throw afterwards (`EnterScorePanel`'s `updateSelectedLegScore()`)
mutates that orphan, not the array entry - invisible as long as the leg is
completed normally (`completeLeg()` reads from the same orphaned-but-mutated
`selectedLeg`, so the correct data still reaches the server), but the moment a
leg is abandoned mid-play via **Back** rather than finished, reopening that
game resumes from the array's stale, never-updated entry (a fresh
501/601/701) instead of the actual progress made. Fixed by mirroring the
existing `selectedGame` resync: `setLegData()` now also reassigns
`selectedLeg` whenever the leg it just wrote matches `selectedLeg.legId`.
Found the same way as #15 - the real-browser walkthrough resolved #15's
failure, which unblocked a downstream E2E step that then caught this one.
Covered by `matchDataStore.spec.ts` ("keeps selectedLeg pointing at the live
leg object after setSelectedLeg() is called before a setLegData() update") and
by the "viewing an In Progress game resumes on the current leg, not a fresh
one" step in `tests/01-start-next-match.spec.ts`.

## Documented, not fixed (out of scope for this change, tracked here)

### 7. "View Statistics" button does nothing
On the launch screen (`LaunchCaptainControl.vue`), the "View Statistics"
button is fully styled and hoverable but has no `@click` handler at all -
unlike the menu bar's dropdown items, which are explicitly marked
`disabled`/`title="Coming soon"`. Clicking it does nothing, with no
affordance telling the user it's not implemented yet.

### 14. A throw entered immediately after starting a game can be silently dropped
Found while verifying #11 in a real browser. `MatchCenter.vue`'s
`onStartMatch()` sets `started.value = true` (which clears the score panel's
`disabled` styling) *before* its async chain - `startGame()` →
`fetchLegs()` → `setSelectedLeg()` → `startLeg()` - finishes populating
`matchDataStore.selectedLeg`/`currentPlayer`. The panel looks interactive
immediately, but `EnterScorePanel.vue`'s `submit()` silently no-ops
(`if (!matchDataStore.currentPlayer || !matchDataStore.selectedLeg) return`)
if a throw is entered in that window - no error, the score is just lost.
Not fixed: a real fix needs `onStartMatch()` to gate the panel's readiness on
something more specific than `started`, which is a small but genuine
behavioural change beyond this session's scope. `pages/MatchCenterScreen.ts`'s
`startGame()` works around it with a fixed wait, documented there.

## Recommendations (not bugs)

### No `data-testid` hooks anywhere in the UI
Every locator in this suite's Page Objects falls back to CSS classes or
accessible role+name, because there are no test hooks. That works, but it's
more brittle to intentional style/copy changes than `data-testid` would be.
Worth adding incrementally to interactive elements as they're touched.

### Dead volume mount in `docker-compose.yml`
The `client` service mounts `- .:/app/`, the entire repo, into a path
(`/app`) the production nginx image never serves from (it serves
`/usr/share/nginx/html`). Harmless today, but confusing, and slow on Windows
bind mounts. Looks like leftover config from an earlier dev-server-based
Dockerfile.
