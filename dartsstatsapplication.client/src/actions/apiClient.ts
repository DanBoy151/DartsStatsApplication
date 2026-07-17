import { useMatchDataStore } from '@/stores/matchDataStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_KEY = import.meta.env.VITE_API_KEY

/**
 * Thrown when the server responds with a non-2xx status. Carries the path and
 * status so callers/UI can distinguish "server said no" from a network or
 * parse failure (which surface as a plain Error/TypeError instead).
 */
export class ApiError extends Error {
  readonly status: number
  readonly path: string
  /** The server's ProblemDetails.detail, when the response body included one (e.g. validation failures). */
  readonly detail?: string

  constructor(path: string, status: number, statusText: string, detail?: string) {
    super(detail ? `Request to ${path} failed: ${detail}` : `Request to ${path} failed: ${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.path = path
    this.detail = detail
  }
}

/** Best-effort read of ApiExceptionHandler's ProblemDetails.detail, if the error body has one. */
async function extractProblemDetail(response: Response): Promise<string | undefined> {
  try {
    const body = await response.clone().json()
    return typeof body?.detail === 'string' ? body.detail : undefined
  } catch {
    return undefined
  }
}

async function handleResponse<T>(path: string, response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await extractProblemDetail(response)
    throw new ApiError(path, response.status, response.statusText, detail)
  }
  // 204 No Content (e.g. successful DELETEs) has no body - response.json() would
  // throw trying to parse an empty string as JSON.
  if (response.status === 204) {
    return undefined as T
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
    const headers = new Headers(init?.headers)
    if (API_KEY) {
      headers.set('X-Api-Key', API_KEY)
    }
    const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
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
