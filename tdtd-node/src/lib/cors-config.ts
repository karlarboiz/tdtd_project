import type cors from 'cors'

export function isProductionEnv(): boolean {
  const tdtd = process.env.TDTD_ENV?.trim().toLowerCase()
  if (tdtd === 'production') return true
  if (tdtd === 'development' || tdtd === 'dev') return false
  return process.env.NODE_ENV?.trim().toLowerCase() === 'production'
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => part.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function assertProductionCorsConfig(): void {
  if (!isProductionEnv()) return
  const origins = parseCorsOrigins(process.env.TDTD_CORS_ORIGINS)
  if (origins.length === 0) {
    throw new Error(
      'TDTD_CORS_ORIGINS is required when TDTD_ENV=production (comma-separated allowlist)',
    )
  }
}

export function getCorsMiddlewareOptions(): cors.CorsOptions {
  const allowlist = parseCorsOrigins(process.env.TDTD_CORS_ORIGINS)

  if (allowlist.length === 0) {
    return { origin: true }
  }

  const allowed = new Set(allowlist)
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS origin not allowed: ${origin}`))
    },
    credentials: true,
  }
}
