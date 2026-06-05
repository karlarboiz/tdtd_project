const DEFAULT_INACTIVITY_WARNING_MS = 60 * 1000
const DEFAULT_INACTIVITY_LOGOUT_MS = 5 * 60 * 1000

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

function resolveTimeoutMs(
  envValue: string | undefined,
  fallback: number,
): number {
  if (!import.meta.env.DEV) return fallback
  return parsePositiveInt(envValue) ?? fallback
}

export const INACTIVITY_WARNING_MS = resolveTimeoutMs(
  import.meta.env.VITE_INACTIVITY_WARNING_MS,
  DEFAULT_INACTIVITY_WARNING_MS,
)

export const INACTIVITY_LOGOUT_MS = Math.max(
  INACTIVITY_WARNING_MS + 1000,
  resolveTimeoutMs(
    import.meta.env.VITE_INACTIVITY_LOGOUT_MS,
    DEFAULT_INACTIVITY_LOGOUT_MS,
  ),
)

export const INACTIVITY_COUNTDOWN_MS =
  INACTIVITY_LOGOUT_MS - INACTIVITY_WARNING_MS
