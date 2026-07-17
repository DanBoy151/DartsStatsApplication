/** Polls a URL until it responds (any HTTP status counts as "up"), or throws after timeoutMs. */
export async function waitForUrl(url: string, timeoutMs = 120_000, intervalMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown

  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000) })
      return
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${url} to respond. Last error: ${String(lastError)}`)
}
