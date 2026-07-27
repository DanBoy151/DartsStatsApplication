import { defineConfig, devices } from '@playwright/test'
import { CLIENT_BASE_URL } from './support/env'

const isCI = !!process.env.CI

// Distinguishes report/artifact output between the separate `playwright
// test` invocations described below (desktop suite vs. mobile vs. tablet) -
// without this they'd all write to the same folder and each later
// invocation would silently clobber the previous one's report. Read
// straight off the --project CLI flag package.json's test:mobile/test:tablet
// scripts already pass, rather than a second env var to keep in sync.
const projectArg = process.argv.find((a) => a.startsWith('--project='))?.split('=')[1]
const reportDirSuffix = projectArg && projectArg !== 'chromium' ? `-${projectArg}` : ''

export default defineConfig({
  testDir: './tests',
  outputDir: `./test-results${reportDirSuffix}`,

  // The app enforces "only one match In Progress at a time" as a global
  // business rule (see MatchControllerValidator.IsValidToStartMatch), and
  // every test in this suite drives a match through that state. Running
  // specs in parallel would make them fight over that single global slot,
  // so the whole run is intentionally serial rather than parallelised.
  // This is also why the mobile/tablet projects (see `projects` below) must
  // each be run as their own separate `playwright test --project=...`
  // invocation (see package.json's test:mobile/test:tablet scripts) rather
  // than together with chromium or each other in one command - globalSetup/
  // globalTeardown boot and tear down a fresh stack per invocation, so a
  // separate invocation is what gives each project's run of the responsive
  // smoke spec its own empty database, free of any match a previous
  // project's run left permanently In Progress.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 1 : 0,

  reporter: [
    ['html', { open: 'never', outputFolder: `playwright-report${reportDirSuffix}` }],
    ['list'],
    ...(isCI ? [['github'] as const] : []),
  ],

  // Boots the isolated docker-compose.e2e.yml stack before the run and tears
  // it down after (see support/global-setup.ts). Works the same way whether
  // it's invoked from a developer's machine or a CI runner - both just need
  // Docker available.
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',

  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: CLIENT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // The responsive smoke spec asserts phone/tablet-tier layout
      // (tab switcher, stacked columns) that desktop never triggers - it
      // belongs to the mobile/tablet projects below instead.
      testIgnore: /responsive-smoke\.spec\.ts/,
    },
    // Add more browsers once the happy path is stable, e.g.:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    // Both run only the reduced responsive smoke spec, not the full serial
    // match-flow suite (see tests/11-responsive-smoke.spec.ts) - that would
    // triple CI runtime for coverage the full suite doesn't actually need
    // repeated at every breakpoint. These exist specifically to catch a
    // future regression in the Match Center phone/tablet layout that the
    // desktop-only suite above can't see.
    // browserName is forced to chromium (the iPhone/iPad presets otherwise
    // default to webkit) so these reuse the same already-installed browser
    // engine as the `chromium` project above - viewport/UA/touch emulation
    // is what this smoke spec actually needs, not real iOS Safari rendering.
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      testMatch: /responsive-smoke\.spec\.ts/,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
      testMatch: /responsive-smoke\.spec\.ts/,
    },
  ],
})
