/**
 * Base URL for REST API.
 * - Production: same origin (leave empty) → `/api/...`
 * - Dev default: browser calls `http://127.0.0.1:3000` directly so saves work even if the Vite
 *   `/api` proxy misbehaves; backend enables CORS. Override with `VITE_API_URL`, or set
 *   `VITE_API_URL=` (empty) to use relative `/api` + Vite proxy only.
 */
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/authStorage'
import type { AuthTokensResponse } from '@/types/schema'

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw === '') return ''
  if (raw) return raw.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://127.0.0.1:3000'
  return ''
}

const API_BASE = resolveApiBase()

export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${p}` : p
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function readErrorBody(body: unknown): { message: string; code?: string } {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const message =
      typeof record.error === 'string' ? record.error : 'Request failed'
    const code = typeof record.code === 'string' ? record.code : undefined
    return { message, code }
  }
  return { message: 'Request failed' }
}

function isPublicAuthPath(path: string): boolean {
  return (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/signup') ||
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/logout') ||
    path.startsWith('/api/auth/forgot-password') ||
    path.startsWith('/api/auth/reset-password')
  )
}

let refreshInFlight: Promise<boolean> | null = null

async function tryRefreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  const res = await fetch(apiPath('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = undefined
  }

  if (!res.ok) {
    await clearTokens()
    return false
  }

  const session = parsed as AuthTokensResponse
  if (!session?.accessToken || !session?.refreshToken) {
    await clearTokens()
    return false
  }

  await setTokens(session.accessToken, session.refreshToken)
  return true
}

async function refreshAccessTokenOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = tryRefreshAccessToken().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
  retryOnUnauthorized = true,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (
    init?.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const access = getAccessToken()
  if (access && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${access}`)
  }

  const res = await fetch(apiPath(path), {
    ...init,
    headers,
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = undefined
  }

  if (
    res.status === 401 &&
    retryOnUnauthorized &&
    !isPublicAuthPath(path) &&
    getRefreshToken()
  ) {
    const refreshed = await refreshAccessTokenOnce()
    if (refreshed) {
      return apiJson<T>(path, init, false)
    }
  }

  if (!res.ok) {
    const { message, code } = readErrorBody(parsed)
    throw new ApiError(res.status, message, code)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return parsed as T
}
