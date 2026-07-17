# E2E tests

Playwright suite covering critical UI paths against a fully isolated copy of
the stack (its own Postgres, API, and client - see `../docker-compose.e2e.yml`).
It never touches a developer's local dev database.

## Requirements

- Docker (Desktop or Engine), with the `docker compose` CLI plugin
- Node >= 20.19

## Running

```bash
npm install
npx playwright install --with-deps chromium   # first time only
npm test
```

That's it - `npm test` builds and starts the isolated stack, waits for it to
be ready, runs the suite, and tears the stack (and its volumes) back down
afterwards. The same command runs locally and in CI
(`.github/workflows/ci.yml`, job `e2e`).

Other scripts:

| Command | What it does |
|---|---|
| `npm run test:headed` | Run with a visible browser window |
| `npm run test:ui` | Open Playwright's interactive UI mode |
| `npm run test:debug` | Step through with the Playwright inspector |
| `npm run report` | Open the last HTML report |
| `npm run stack:up` / `stack:down` | Manage the e2e docker stack by hand |

## Useful env vars

| Var | Default | Purpose |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:8085` | Client URL the browser navigates to |
| `E2E_API_BASE_URL` | `http://localhost:5252` | API URL used for test-data seeding |
| `E2E_MANAGE_STACK` | `1` | Set to `0` to skip docker lifecycle management and just run tests against whatever is already up at the URLs above |
| `E2E_KEEP_STACK` | unset | Set to `1` to leave the stack running after the suite finishes (handy for local debugging - inspect it, then `npm run stack:down` when done) |

## Structure

- `pages/` - Page Object Model classes, one per screen/component
- `fixtures/` - `test.ts` (custom Playwright `test` wiring up page objects and
  seeded data) and `api-client.ts` (seeds Players/Matches directly via the
  real API for deterministic setup)
- `support/` - stack lifecycle (`global-setup.ts` / `global-teardown.ts`,
  `docker-stack.ts`) and shared config (`env.ts`)
- `tests/` - specs

## Known issues found while writing this suite

See [`BUGS.md`](./BUGS.md).
