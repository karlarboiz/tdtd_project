import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { getAttendanceSessionDatesRange } from '../../api/attendanceApi'
import { getHolidaysInRange } from '../../api/holidaysApi'
import { listMissedDueItems } from '../../api/dueListApi'
import { DueList } from '../../components/DueList/DueList'
import { MonthlyCalendar } from '../../components/MonthlyCalendar/MonthlyCalendar'
import { isWeekendDate, toYMD } from '../../lib/dates'
import { uniqueDatesFromMissedDueItems } from '../../lib/missedAttendanceDates'

export function AttendanceCalendar() {
  const navigate = useNavigate()
  const location = useLocation()
  const todayYmd = toYMD(new Date())
  const [sessionDatesWithSavedAttendance, setSessionDatesWithSavedAttendance] =
    useState<ReadonlySet<string>>(new Set())
  const [sessionDatesWithMissedAttendance, setSessionDatesWithMissedAttendance] =
    useState<ReadonlySet<string>>(new Set())
  const [nonSchoolDates, setNonSchoolDates] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [holidayNamesByDate, setHolidayNamesByDate] = useState<
    ReadonlyMap<string, string>
  >(new Map())
  const visibleMonthRef = useRef<{ year: number; month: number } | null>(null)
  const todayHolidayName = holidayNamesByDate.get(todayYmd)
  const todayIsNonSchool =
    isWeekendDate(new Date()) ||
    nonSchoolDates.has(todayYmd) ||
    Boolean(todayHolidayName)

  const loadMonthSessionDates = useCallback(
    async (year: number, month: number) => {
      visibleMonthRef.current = { year, month }
      const from = toYMD(new Date(year, month, 1))
      const monthEnd = toYMD(new Date(year, month + 1, 0))
      const today = toYMD(new Date())
      const to = monthEnd > today ? today : monthEnd

      try {
        const savedPromise = getAttendanceSessionDatesRange({ from, to: monthEnd })
        const missedPromise =
          from > today
            ? Promise.resolve([])
            : listMissedDueItems({ from, to })
        const holidaysPromise = getHolidaysInRange({ from, to: monthEnd })

        const [{ dates }, missed, holidays] = await Promise.all([
          savedPromise,
          missedPromise,
          holidaysPromise,
        ])
        setSessionDatesWithSavedAttendance(new Set(dates))
        setSessionDatesWithMissedAttendance(
          uniqueDatesFromMissedDueItems(missed),
        )
        setNonSchoolDates(new Set(holidays.dates))
        setHolidayNamesByDate(
          new Map(holidays.holidays.map((h) => [h.date, h.name])),
        )
      } catch {
        setSessionDatesWithSavedAttendance(new Set())
        setSessionDatesWithMissedAttendance(new Set())
        setNonSchoolDates(new Set())
        setHolidayNamesByDate(new Map())
      }
    },
    [],
  )

  useEffect(() => {
    const visible = visibleMonthRef.current
    if (visible) {
      void loadMonthSessionDates(visible.year, visible.month)
    }
  }, [loadMonthSessionDates, location.pathname])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const visible = visibleMonthRef.current
      if (visible) {
        void loadMonthSessionDates(visible.year, visible.month)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadMonthSessionDates])

  return (
    <PageContainer>
      <PageContentReveal>
        <div className="mb-4">
          <DueList variant="compact" />
        </div>

        {todayIsNonSchool ? (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm font-medium text-slate-600">
              {todayHolidayName
                ? `No attendance today — ${todayHolidayName}. Pick another school day from the calendar.`
                : 'No attendance on weekends — pick a weekday from the calendar.'}
            </p>
          </div>
        ) : null}

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Pick a date</h1>
        </div>

        <MonthlyCalendar
          sessionDatesWithSavedAttendance={sessionDatesWithSavedAttendance}
          sessionDatesWithMissedAttendance={sessionDatesWithMissedAttendance}
          nonSchoolDates={nonSchoolDates}
          holidayNamesByDate={holidayNamesByDate}
          onVisibleMonthChange={loadMonthSessionDates}
          onSelectDate={(ymd) => {
            navigate(`/attendance/session/${encodeURIComponent(ymd)}`)
          }}
        />
      </PageContentReveal>
    </PageContainer>
  )
}
