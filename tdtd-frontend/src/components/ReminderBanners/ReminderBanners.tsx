import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAttendancePresentRoster } from '@/api/attendanceApi'
import { attendanceSessionPath } from '@/lib/attendanceSessionRoute'
import { isWeekendDate, toYMD } from '@/lib/dates'
import { otherAttendancePeriod } from '@/lib/period'
import { warningBannerLinkClass } from '@/lib/uiClasses'
import type { AttendancePeriod } from '@/types/schema'

const AM_PERIOD: AttendancePeriod = 'AM'
const PERIODS: readonly AttendancePeriod[] = [
  AM_PERIOD,
  otherAttendancePeriod(AM_PERIOD),
]

function reminderCopy(period: AttendancePeriod): string {
  return period === 'AM'
    ? 'No AM session saved today'
    : 'No PM session saved today'
}

type ReminderState = {
  todayYmd: string
  missing: AttendancePeriod[]
}

/**
 * In-app reminders when today's AM and/or PM attendance session is not saved.
 * `session-dates` only lists days that have any session, so period presence
 * comes from the existing present-roster read (`session === null`).
 */
export function ReminderBanners() {
  const [state, setState] = useState<ReminderState | null>(null)

  useEffect(() => {
    const today = new Date()
    const todayYmd = toYMD(today)
    if (isWeekendDate(today)) {
      setState({ todayYmd, missing: [] })
      return
    }
    let cancelled = false

    void (async () => {
      try {
        const results = await Promise.all(
          PERIODS.map(async (period) => {
            const data = await getAttendancePresentRoster({
              date: todayYmd,
              period,
            })
            return { period, saved: data.session !== null }
          }),
        )
        if (cancelled) return
        setState({
          todayYmd,
          missing: results.filter((row) => !row.saved).map((row) => row.period),
        })
      } catch {
        if (!cancelled) setState({ todayYmd, missing: [] })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  if (!state || state.missing.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {state.missing.map((period) => (
        <Link
          key={period}
          to={attendanceSessionPath(state.todayYmd, period)}
          className={warningBannerLinkClass}
        >
          {reminderCopy(period)}
        </Link>
      ))}
    </div>
  )
}
