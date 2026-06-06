import { useCallback, useEffect, useRef } from 'react'
import { createInactivityTimer } from '@/hooks/inactivityTimer'

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'click',
  'scroll',
  'touchstart',
] as const

type UseInactivityTimeoutOptions = {
  enabled: boolean
  warningMs: number
  logoutMs: number
  onWarning: () => void
  onLogout: () => void
  onDismissWarning?: () => void
}

export function useInactivityTimeout({
  enabled,
  warningMs,
  logoutMs,
  onWarning,
  onLogout,
  onDismissWarning,
}: UseInactivityTimeoutOptions) {
  const onWarningRef = useRef(onWarning)
  const onLogoutRef = useRef(onLogout)
  const onDismissWarningRef = useRef(onDismissWarning)
  const timerRef = useRef<ReturnType<typeof createInactivityTimer> | null>(null)

  onWarningRef.current = onWarning
  onLogoutRef.current = onLogout
  onDismissWarningRef.current = onDismissWarning

  useEffect(() => {
    if (!enabled) {
      timerRef.current?.stop()
      timerRef.current = null
      return
    }

    const timer = createInactivityTimer(
      {
        onWarning: () => onWarningRef.current(),
        onLogout: () => onLogoutRef.current(),
        onDismissWarning: () => onDismissWarningRef.current?.(),
      },
      { warningMs, logoutMs },
    )
    timerRef.current = timer
    timer.start()

    const onActivity = () => {
      timer.handleActivity()
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        timer.pause()
        return
      }
      timer.resume()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      timer.stop()
      timerRef.current = null
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, warningMs, logoutMs])

  const reset = useCallback(() => {
    timerRef.current?.reset()
  }, [])

  return { reset }
}
