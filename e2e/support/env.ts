/**
 * Single source of truth for the URLs the suite targets. Both default to the
 * isolated docker-compose.e2e.yml stack (see support/global-setup.ts), but
 * can be pointed anywhere - e.g. a stack someone already has running - by
 * setting the env vars before running Playwright.
 */
export const CLIENT_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8085'
export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:5252'

/** Set to '1' to skip docker lifecycle management entirely (stack already running, managed elsewhere - e.g. CI). */
export const MANAGE_STACK = process.env.E2E_MANAGE_STACK !== '0'

/** Set to '1' to leave the stack running after the suite finishes, for local debugging. */
export const KEEP_STACK = process.env.E2E_KEEP_STACK === '1'
