import { useMatchDataStore } from '@/stores/matchDataStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Thrown when the server responds with a non-2xx status. Carries the path and
 * status so callers/UI can distinguish "server said no" from a network or
 * parse failure (which surface as a plain Error/TypeError instead).
 */
export class ApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(path: string, status: number, statusText: string) {
    super(`Request to ${path} failed: ${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

async function handleResponse<T>(path: string, response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(path, response.status, response.statusText)
  }
  return response.json() as Promise<T>
}

/**
 * Shared request path for apiGet/apiRequest. On success, clears any
 * previously-surfaced error banner; on failure, sets one with a
 * user-readable message before re-throwing so callers can still do their own
 * (console-level) handling as today.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const matchDataStore = useMatchDataStore()
  try {
    const response = await fetch(`${BASE_URL}${path}`, init)
    const result = await handleResponse<T>(path, response)
    matchDataStore.clearError()
    return result
  } catch (err) {
    matchDataStore.setError(err instanceof Error ? err.message : `Request to ${path} failed`)
    throw err
  }
}

/** GET request against the API, returning the parsed JSON body as T. */
export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

/** PUT/POST/etc. request against the API, returning the parsed JSON body as T. */
export function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init)
}
