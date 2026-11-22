import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'
import { DueListSkeleton } from '@/components/LoadingSkeleton/DueListSkeleton'
import { useDueItems } from '@/hooks/useDueItems'
import { getHolidayForDate } from '@/api/holidaysApi'
import { isWeekendDate, toYMD } from '@/lib/dates'
import type { DueItem } from '@/types/schema'

type DueListProps = {
  variant?: 'default' | 'compact'
  showEmptyState?: boolean
  items?: DueItem[]
  loading?: boolean
  onDismiss?: (id: string) => void
}

export function DueList({
  variant = 'default',
  showEmptyState = false,
  items: itemsProp,
  loading: loadingProp,
  onDismiss: onDismissProp,
}: DueListProps) {
  const internal = useDueItems()
  const items = itemsProp ?? internal.items
  const loading = loadingProp ?? internal.loading
  const onDismiss = onDismissProp ?? internal.dismiss
  const [todayHolidayName, setTodayHolidayName] = useState<string | null>(null)

  useEffect(() => {
    if (loading || items.length > 0 || isWeekendDate(new Date())) {
      setTodayHolidayName(null)
      return
    }
    const today = toYMD(new Date())
    let cancelled = false
    void getHolidayForDate(today)
      .then((result) => {
        if (cancelled) return
        setTodayHolidayName(result.holidays[0]?.name ?? null)
      })
      .catch(() => {
        if (cancelled) return
        setTodayHolidayName(null)
      })
    return () => {
      cancelled = true
    }
  }, [items.length, loading])

  const headingClass =
    variant === 'compact'
      ? 'text-sm font-semibold text-amber-950'
      : 'text-base font-semibold text-amber-950'

  if (loading) {
    return (
      <section
        className="flex w-full flex-col gap-3"
        aria-labelledby="due-list-heading"
      >
        <h2 id="due-list-heading" className={headingClass}>
          Due
        </h2>
        <DueListSkeleton />
      </section>
    )
  }

  if (items.length === 0) {
    if (!showEmptyState) {
      return null
    }

    const weekend = isWeekendDate(new Date())

    return (
      <section
        className="flex w-full flex-col gap-3"
        aria-labelledby="due-list-heading"
      >
        <h2 id="due-list-heading" className={headingClass}>
          Due
        </h2>
        <div className="rounded-2xl border border-secondary/40 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-medium text-secondary">
            {weekend
              ? 'No attendance due on weekends.'
              : todayHolidayName
                ? `No attendance due today — ${todayHolidayName}.`
                : "You're all caught up for today."}
          </p>
        </div>
      </section>
    )
  }

  const listKey = items.map((item) => item.id).join(',')

  return (
    <section
      className="flex w-full flex-col gap-3"
      aria-labelledby="due-list-heading"
    >
      <h2 id="due-list-heading" className={headingClass}>
        Due
      </h2>
      <ContentReveal revealKey={listKey}>
        <ul
          className="flex flex-col gap-3"
          role="list"
          aria-live="polite"
        >
          {items.map((item) => (
          <li
            key={item.id}
            role="listitem"
            className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold sm:text-base">{item.title}</p>
              <p className="mt-0.5 text-sm text-amber-900">{item.message}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to={item.actionPath}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Do it
              </Link>
              <button
                type="button"
                onClick={() => void onDismiss(item.id)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>
          </li>
          ))}
        </ul>
      </ContentReveal>
    </section>
  )
}
