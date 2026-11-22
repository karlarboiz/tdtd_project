import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAttendanceSessionDatesRange } from '../../api/attendanceApi'
import { MonthlyCalendar } from '../../components/MonthlyCalendar/MonthlyCalendar'
import { ReminderBanners } from '../../components/ReminderBanners/ReminderBanners'
import { toYMD } from '../../lib/dates'

export function AttendanceCalendar() {
  const navigate = useNavigate()
  const [sessionDatesWithSavedAttendance, setSessionDatesWithSavedAttendance] =
    useState<ReadonlySet<string>>(new Set())

  const loadMonthSessionDates = useCallback(
    async (year: number, month: number) => {
      const from = toYMD(new Date(year, month, 1))
      const to = toYMD(new Date(year, month + 1, 0))
      try {
        const { dates } = await getAttendanceSessionDatesRange({ from, to })
        setSessionDatesWithSavedAttendance(new Set(dates))
      } catch {
        setSessionDatesWithSavedAttendance(new Set())
      }
    },
    [],
  )

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Pick a date</h1>
        </div>

        <ReminderBanners />

        <MonthlyCalendar
          sessionDatesWithSavedAttendance={sessionDatesWithSavedAttendance}
          onVisibleMonthChange={loadMonthSessionDates}
          onSelectDate={(ymd) => {
            navigate(`/attendance/session/${encodeURIComponent(ymd)}`)
          }}
        />
      </div>
    </div>
  )
}
