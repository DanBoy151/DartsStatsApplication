import { stopStack } from './docker-stack'
import { KEEP_STACK, MANAGE_STACK } from './env'

export default async function globalTeardown() {
  if (!MANAGE_STACK) return

  if (KEEP_STACK) {
    console.log('[global-teardown] E2E_KEEP_STACK=1, leaving the stack running for inspection.')
    console.log('[global-teardown] tear it down manually with: npm run stack:down')
    return
  }

  console.log('[global-teardown] stopping e2e docker stack and removing volumes...')
  stopStack()
}
