import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listMissedDueItems } from '@/api/dueListApi'
import { formatLongDate } from '@/lib/dates'
import type { DueItem } from '@/types/schema'

function dateRangeLabel(items: DueItem[]): string | null {
  if (items.length === 0) return null
  const dates = [...new Set(items.map((i) => i.date))].sort()
  const first = dates[0]!
  const last = dates[dates.length - 1]!
  if (first === last) return formatLongDate(first)
  return `${formatLongDate(first)} – ${formatLongDate(last)}`
}

export function MissedWorkSummary() {
  const location = useLocation()
  const [items, setItems] = useState<DueItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listMissedDueItems())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, location.pathname])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const rangeLabel = useMemo(() => dateRangeLabel(items), [items])

  if (loading || items.length === 0) {
    return null
  }

  const count = items.length
  const sessionLabel = count === 1 ? 'session' : 'sessions'

  return (
    <section
      className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm"
      aria-labelledby="missed-work-heading"
    >
      <h2
        id="missed-work-heading"
        className="text-base font-semibold text-amber-950"
      >
        Missed work
      </h2>
      <p className="mt-2 text-sm text-amber-900">
        {count} missed attendance {sessionLabel}
        {rangeLabel ? (
          <>
            {' '}
            <span className="text-amber-800">({rangeLabel})</span>
          </>
        ) : null}
      </p>
      <Link
        to="/due-list"
        className="mt-4 inline-block text-sm font-semibold text-amber-950 hover:underline"
      >
        Review missed work →
      </Link>
    </section>
  )
}
