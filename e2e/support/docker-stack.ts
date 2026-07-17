import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COMPOSE_FILE = path.resolve(__dirname, '../../docker-compose.e2e.yml')

function compose(args: string[], timeoutMs: number) {
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
    stdio: 'inherit',
    timeout: timeoutMs,
  })
}

/** Builds (if needed) and starts the isolated e2e stack, blocking until every service reports running/healthy. */
export function startStack() {
  compose(['up', '-d', '--build', '--wait', '--wait-timeout', '180'], 5 * 60 * 1000)
}

/** Stops the stack and removes its volumes, so the next run starts from an empty database. */
export function stopStack() {
  compose(['down', '-v'], 2 * 60 * 1000)
}
