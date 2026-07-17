# Findings from building the E2E suite

Discovered while implementing Playwright coverage of the "start next match"
critical path (see `tests/start-next-match.spec.ts`). Grouped by what was
done about them.

## Fixed (blocked the critical path or the CI pipeline itself)

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

### 2. `docker-compose.yml` client build context had the wrong case
`context: ./DartsStatsApplication.Client/` pointed at a directory that's
actually named `dartsstatsapplication.client` (all lowercase, per `git
ls-files`). Windows/macOS filesystems hide this; Linux does not - so `docker
compose build` would fail on any Linux CI runner or Linux host. Fixed by
correcting the casing. Not strictly required for the new `e2e` CI job (which
uses its own `docker-compose.e2e.yml` with the correct path already), but
it's the same class of bug and blocks real deployment on Linux.

## Documented, not fixed (out of scope for this change, tracked here)

### 3. `PUT /Match/{id}/complete` has the same sync-Marten-query bug
`MatchService.CompleteMatch()` runs
`_documentSession.Query<Game>().Where(g => g.data.matchId == _match.Id).ToList()`
directly on the Marten `IQueryable` - no `await`, no `ToListAsync()`. This
will throw the same `NotSupportedException` → 500 as issue #1 the first time
anyone actually tries to complete a match. Out of scope for the "start next
match" path this suite covers, but should be fixed the same way
(`await ... .ToListAsync()`) before the complete-match flow is trusted or
tested.

### 4. Refreshing the page mid-match discards all local progress
`MainContent.vue`'s `onMounted` calls `matchDataStore.clearStore()`
unconditionally via `resetMatchDataStore()`. The store is declared
`persist: true` and has a purpose-built `resetStore()` that only clears data
older than 6 hours (`stores/matchDataStore.ts`) - but nothing ever calls
`resetStore()`. Net effect: persistence is currently pointless, and any page
reload (or SPA remount) during a live match silently wipes selected players,
game progress, and leg scores. Likely should call `resetStore()` instead of
`clearStore()`.

### 5. "No next match" looks identical to a server error
This is the bug reported at the start of this session
(`Request to api/Match/next failed: 404 Not Found`). `apiClient.ts`'s
`request()` treats every non-2xx response as an error and pushes it to the
same red toast, but a 404 from `GET /api/Match/next` is a legitimate,
expected state (nothing scheduled yet) - e.g. on first launch of a fresh
install, exactly what a new user sees. There's no empty-state UI at all; the
user's first experience of the app is an error banner. Characterized (not
fixed) by the first test in `tests/start-next-match.spec.ts`, so a future fix
shows up as a deliberate, visible diff to that test rather than a silent
behavior change.

### 6. Race condition when confirming available players
`AvailablePlayersControl.vue`'s `proceed()` calls `setAvailablePlayers()`
without `await` and immediately emits `'proceed'`, navigating to the holding
screen before the `PUT /update-available-players` request resolves. If that
request fails or is slow, the user is already on the next screen with no
indication the roster wasn't saved - the only handling is a `console.error`.
The E2E spec works around this deliberately (it waits for the response itself
before asserting on the next screen) rather than silently racing it.

### 7. "View Statistics" button does nothing
On the launch screen (`LaunchCaptainControl.vue`), the "View Statistics"
button is fully styled and hoverable but has no `@click` handler at all -
unlike the menu bar's dropdown items, which are explicitly marked
`disabled`/`title="Coming soon"`. Clicking it does nothing, with no
affordance telling the user it's not implemented yet.

### 8. Dead `error` ref in `MainContent.vue`
`const error = ref(false)` is declared and rendered (`v-if="error"` /
`.error-message`), but nothing ever sets it - the real error surface is
`ErrorToast.vue`, reading `matchDataStore.lastError`. Harmless, but dead and
slightly misleading code.

### 9. Holding screen's "Back" button skips a level
`HoldingScreenControl.vue`'s button is labelled "Back" but wired to an
`exit` event that, in `MatchControl.vue`, returns all the way to the
Available Players screen - not to wherever the user came from. Not
necessarily wrong, but worth a product check: a captain partway through
picking a game who taps "Back" may expect one step back, not a return to
player selection.

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
