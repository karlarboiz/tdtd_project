import {
  INACTIVITY_LOGOUT_MS,
  INACTIVITY_WARNING_MS,
} from '@/lib/inactivityConfig'

export type InactivityTimerCallbacks = {
  onWarning: () => void
  onLogout: () => void
  onDismissWarning?: () => void
}

type TimerIds = {
  warning: ReturnType<typeof setTimeout> | null
  logout: ReturnType<typeof setTimeout> | null
}

export function createInactivityTimer(callbacks: InactivityTimerCallbacks) {
  let lastActivityAt = Date.now()
  let warningShown = false
  let paused = false
  let timers: TimerIds = { warning: null, logout: null }
  let remainingWarningMs = INACTIVITY_WARNING_MS
  let remainingLogoutMs = INACTIVITY_LOGOUT_MS

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

  function scheduleTimers(warningMs: number, logoutMs: number) {
    clearTimers()
    remainingWarningMs = warningMs
    remainingLogoutMs = logoutMs

    if (!warningShown && warningMs > 0) {
      timers.warning = setTimeout(() => {
        warningShown = true
        timers.warning = null
        remainingWarningMs = 0
        callbacks.onWarning()
      }, warningMs)
    }

    if (logoutMs > 0) {
      timers.logout = setTimeout(() => {
        timers.logout = null
        remainingLogoutMs = 0
        callbacks.onLogout()
      }, logoutMs)
    }
  }

  function syncRemainingFromActivity() {
    const elapsed = Date.now() - lastActivityAt
    remainingWarningMs = warningShown
      ? 0
      : Math.max(0, INACTIVITY_WARNING_MS - elapsed)
    remainingLogoutMs = Math.max(0, INACTIVITY_LOGOUT_MS - elapsed)
  }

  function start() {
    paused = false
    lastActivityAt = Date.now()
    warningShown = false
    scheduleTimers(INACTIVITY_WARNING_MS, INACTIVITY_LOGOUT_MS)
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
    scheduleTimers(INACTIVITY_WARNING_MS, INACTIVITY_LOGOUT_MS)
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
