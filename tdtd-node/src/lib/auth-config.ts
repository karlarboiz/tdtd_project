const DEV_ACCESS_SECRET = 'tdtd-dev-access-secret-change-in-production'
const DEV_REFRESH_PEPPER = 'tdtd-dev-refresh-pepper-change-in-production'

export function getAccessTokenSecret(): string {
  return process.env.TDTD_JWT_ACCESS_SECRET?.trim() || DEV_ACCESS_SECRET
}

export function getRefreshTokenPepper(): string {
  return process.env.TDTD_REFRESH_TOKEN_PEPPER?.trim() || DEV_REFRESH_PEPPER
}

export function getAccessTokenTtlSeconds(): number {
  const raw = process.env.TDTD_ACCESS_TOKEN_TTL_MINUTES
  const minutes = raw ? Number(raw) : 15
  if (!Number.isFinite(minutes) || minutes < 1) return 15 * 60
  return Math.floor(minutes * 60)
}

export function getRefreshTokenTtlMs(): number {
  const raw = process.env.TDTD_REFRESH_TOKEN_TTL_DAYS
  const days = raw ? Number(raw) : 14
  if (!Number.isFinite(days) || days < 1) return 14 * 24 * 60 * 60 * 1000
  return Math.floor(days * 24 * 60 * 60 * 1000)
}

export function getPasswordMaxAgeMs(): number {
  const raw = process.env.TDTD_PASSWORD_MAX_AGE_DAYS
  const days = raw ? Number(raw) : 60
  if (!Number.isFinite(days) || days < 1) return 60 * 24 * 60 * 60 * 1000
  return Math.floor(days * 24 * 60 * 60 * 1000)
}

export function getPasswordResetTtlMs(): number {
  const raw = process.env.TDTD_PASSWORD_RESET_TTL_MINUTES
  const minutes = raw ? Number(raw) : 60
  if (!Number.isFinite(minutes) || minutes < 1) return 60 * 60 * 1000
  return Math.floor(minutes * 60 * 1000)
}

export function getAppUrl(): string {
  const raw = process.env.TDTD_APP_URL?.trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'http://localhost:5173'
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.TDTD_SMTP_HOST?.trim())
}
