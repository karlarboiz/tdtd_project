import { useEffect, useMemo, useState } from 'react'
import { toYMD, startOfLocalDay } from '../../lib/dates'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

type Cell =
  | { kind: 'empty' }
  | {
      kind: 'day'
      date: Date
      ymd: string
      disabled: boolean
      isToday: boolean
    }

function buildMonthGrid(year: number, month: number, today: Date): Cell[] {
  const todayStart = startOfLocalDay(today).getTime()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Cell[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ kind: 'empty' })

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const ymd = toYMD(date)
    const dayStart = startOfLocalDay(date).getTime()
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isFuture = dayStart > todayStart
    const disabled = isFuture || isWeekend
    const isToday = dayStart === todayStart
    cells.push({
      kind: 'day',
      date,
      ymd,
      disabled,
      isToday,
    })
  }
  return cells
}

type MonthlyCalendarProps = {
  onSelectDate: (ymd: string) => void
  /** Dates (YYYY-MM-DD) that already have at least one saved attendance session */
  sessionDatesWithSavedAttendance?: ReadonlySet<string>
  /** Called when the visible month/year changes (including initial mount). */
  onVisibleMonthChange?: (year: number, month: number) => void
}

export function MonthlyCalendar({
  onSelectDate,
  sessionDatesWithSavedAttendance,
  onVisibleMonthChange,
}: MonthlyCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }))

  const title = useMemo(
    () =>
      new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [view.month, view.year],
  )

  const grid = useMemo(
    () => buildMonthGrid(view.year, view.month, today),
    [today, view.month, view.year],
  )

  useEffect(() => {
    onVisibleMonthChange?.(view.year, view.month)
  }, [view.year, view.month, onVisibleMonthChange])

  function goPrev() {
    setView((v) => {
      const m = v.month - 1
      if (m < 0) return { year: v.year - 1, month: 11 }
      return { year: v.year, month: m }
    })
  }

  function goNext() {
    setView((v) => {
      const m = v.month + 1
      if (m > 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: m }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg border border-slate-200 bg-neutral-bg px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-secondary hover:bg-teal-50 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg border border-slate-200 bg-neutral-bg px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-secondary hover:bg-teal-50 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (cell.kind === 'empty') {
            return <div key={`e-${i}`} className="aspect-square" />
          }

          const { disabled, isToday, ymd } = cell
          const hasSavedAttendance =
            !disabled &&
            (sessionDatesWithSavedAttendance?.has(ymd) ?? false)
          const dayLabel = cell.date.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
          const ariaLabel = disabled
            ? undefined
            : hasSavedAttendance
              ? `${dayLabel}, attendance saved`
              : `${dayLabel}, select to take attendance`
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(ymd)}
              aria-label={ariaLabel}
              className={[
                'touch-manipulation flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-medium transition',
                disabled
                  ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                  : 'cursor-pointer bg-neutral-bg text-slate-800 hover:bg-teal-50 hover:ring-2 hover:ring-secondary/40',
                !disabled && isToday ? 'ring-2 ring-primary/50' : '',
              ].join(' ')}
            >
              <span>{cell.date.getDate()}</span>
              {hasSavedAttendance && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
