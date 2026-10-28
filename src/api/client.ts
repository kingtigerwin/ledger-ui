import type { TokenResponse, User } from './types'

// The UI, ledger-api (/api/*) and ledger-agent (/agent/*) share one origin: CloudFront in
// production, Vite's proxy in dev. So paths are relative and the refresh cookie is first-party.

export class ApiError extends Error {
  readonly status: number
  /** ledger-api's stable error code, e.g. `account_pending`; `network_error` when unreachable. */
  readonly code: string
  /** For `validation_failed`, the issues ledger-api found; each `path` names the field. */
  readonly details?: { path: (string | number)[]; message: string }[]

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiError['details'],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string
}

export async function request<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'Could not reach the server. Check your connection.',
    )
  }

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => undefined)
  if (!response.ok) {
    const error = data?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ??
        `Something went wrong (HTTP ${response.status}). Please try again.`,
      error?.details,
    )
  }
  return data as T
}

export const login = (username: string, password: string) =>
  request<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  })

export const register = (username: string, password: string, email: string) =>
  request<User>('/api/v1/auth/register', {
    method: 'POST',
    body: { username, password, email },
  })

export const logout = () =>
  request<void>('/api/v1/auth/logout', { method: 'POST' })

export const fetchMe = (token: string) =>
  request<User>('/api/v1/auth/me', { token })

let refreshing: Promise<TokenResponse> | null = null

/**
 * Trades the refresh cookie for a new access token. ledger-api replaces the refresh token on
 * every use and treats a replayed one as stolen (it revokes all of them), so concurrent callers
 * (StrictMode's double effects, several requests hitting 401 together) share one call.
 */
export function refresh(): Promise<TokenResponse> {
  refreshing ??= request<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}
