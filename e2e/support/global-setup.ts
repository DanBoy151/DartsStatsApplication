import { startStack } from './docker-stack'
import { waitForUrl } from './wait-for'
import { API_BASE_URL, CLIENT_BASE_URL, MANAGE_STACK } from './env'

export default async function globalSetup() {
  if (MANAGE_STACK) {
    console.log('[global-setup] starting isolated e2e docker stack...')
    startStack()
  } else {
    console.log('[global-setup] E2E_MANAGE_STACK=0, assuming the stack is already running.')
  }

  console.log(`[global-setup] waiting for API at ${API_BASE_URL} ...`)
  await waitForUrl(`${API_BASE_URL}/api/Player`)

  console.log(`[global-setup] waiting for client at ${CLIENT_BASE_URL} ...`)
  await waitForUrl(CLIENT_BASE_URL)

  console.log('[global-setup] stack is ready.')
}
