import { defineConfig, devices } from '@playwright/test'
import { CLIENT_BASE_URL } from './support/env'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  // The app enforces "only one match In Progress at a time" as a global
  // business rule (see MatchControllerValidator.IsValidToStartMatch), and
  // every test in this suite drives a match through that state. Running
  // specs in parallel would make them fight over that single global slot,
  // so the whole run is intentionally serial rather than parallelised.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 1 : 0,

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
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
    },
    // Add more browsers once the happy path is stable, e.g.:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
