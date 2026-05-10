/**
 * Base URL for REST API.
 * - Production: same origin (leave empty) → `/api/...`
 * - Dev default: browser calls `http://127.0.0.1:3000` directly so saves work even if the Vite
 *   `/api` proxy misbehaves; backend enables CORS. Override with `VITE_API_URL`, or set
 *   `VITE_API_URL=` (empty) to use relative `/api` + Vite proxy only.
 */
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

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readErrorMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error: unknown }).error
    return typeof e === 'string' ? e : 'Request failed'
  }
  return 'Request failed'
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  if (
    init?.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
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

  if (!res.ok) {
    throw new ApiError(res.status, readErrorMessage(parsed))
  }

  return parsed as T
}
