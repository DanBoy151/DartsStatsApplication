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

## Documented, not fixed (out of scope for this change, tracked here)

### 7. "View Statistics" button does nothing
On the launch screen (`LaunchCaptainControl.vue`), the "View Statistics"
button is fully styled and hoverable but has no `@click` handler at all -
unlike the menu bar's dropdown items, which are explicitly marked
`disabled`/`title="Coming soon"`. Clicking it does nothing, with no
affordance telling the user it's not implemented yet.

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
