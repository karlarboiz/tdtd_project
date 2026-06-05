export type InactivityTimerCallbacks = {
  onWarning: () => void
  onLogout: () => void
  onDismissWarning?: () => void
}

export type InactivityTimerOptions = {
  warningMs: number
  logoutMs: number
}

type TimerIds = {
  warning: ReturnType<typeof setTimeout> | null
  logout: ReturnType<typeof setTimeout> | null
}

export function createInactivityTimer(
  callbacks: InactivityTimerCallbacks,
  { warningMs, logoutMs }: InactivityTimerOptions,
) {
  let lastActivityAt = Date.now()
  let warningShown = false
  let paused = false
  let timers: TimerIds = { warning: null, logout: null }
  let remainingWarningMs = warningMs
  let remainingLogoutMs = logoutMs

  function clearTimers() {
    if (timers.warning) {
      clearTimeout(timers.warning)
      timers.warning = null
    }
    if (timers.logout) {
      clearTimeout(timers.logout)
      timers.logout = null
    }
  }

  function scheduleTimers(nextWarningMs: number, nextLogoutMs: number) {
    clearTimers()
    remainingWarningMs = nextWarningMs
    remainingLogoutMs = nextLogoutMs

    if (!warningShown && nextWarningMs > 0) {
      timers.warning = setTimeout(() => {
        warningShown = true
        timers.warning = null
        remainingWarningMs = 0
        callbacks.onWarning()
      }, nextWarningMs)
    }

    if (nextLogoutMs > 0) {
      timers.logout = setTimeout(() => {
        timers.logout = null
        remainingLogoutMs = 0
        callbacks.onLogout()
      }, nextLogoutMs)
    }
  }

  function syncRemainingFromActivity() {
    const elapsed = Date.now() - lastActivityAt
    remainingWarningMs = warningShown
      ? 0
      : Math.max(0, warningMs - elapsed)
    remainingLogoutMs = Math.max(0, logoutMs - elapsed)
  }

  function start() {
    paused = false
    lastActivityAt = Date.now()
    warningShown = false
    scheduleTimers(warningMs, logoutMs)
  }

  function stop() {
    paused = false
    warningShown = false
    clearTimers()
  }

  function reset() {
    if (paused) return
    const wasWarningShown = warningShown
    lastActivityAt = Date.now()
    warningShown = false
    if (wasWarningShown) {
      callbacks.onDismissWarning?.()
    }
    scheduleTimers(warningMs, logoutMs)
  }

  function handleActivity() {
    if (paused) return
    reset()
  }

  function pause() {
    if (paused) return
    syncRemainingFromActivity()
    paused = true
    clearTimers()
  }

  function resume() {
    if (!paused) return
    paused = false
    lastActivityAt = Date.now()
    scheduleTimers(remainingWarningMs, remainingLogoutMs)
  }

  return {
    start,
    stop,
    reset,
    handleActivity,
    pause,
    resume,
    getWarningShown: () => warningShown,
    getRemainingLogoutMs: () => remainingLogoutMs,
  }
}
