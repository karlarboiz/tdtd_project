import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listMissedDueItems } from '@/api/dueListApi'
import { formatLongDate } from '@/lib/dates'
import { ApiError } from '@/lib/http'
import { errorAlertClass } from '@/lib/uiClasses'
import type { DueItem } from '@/types/schema'

type DateGroup = {
  date: string
  label: string
  items: DueItem[]
}

function groupByDate(items: DueItem[]): DateGroup[] {
  const groups: DateGroup[] = []
  let currentDate: string | null = null

  for (const item of items) {
    if (item.date !== currentDate) {
      groups.push({
        date: item.date,
        label: formatLongDate(item.date),
        items: [item],
      })
      currentDate = item.date
    } else {
      groups[groups.length - 1]!.items.push(item)
    }
  }
  return groups
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${spinning ? 'animate-spin' : ''}`}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function DueListPage() {
  const location = useLocation()
  const [items, setItems] = useState<DueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      setItems(await listMissedDueItems())
    } catch (err) {
      setItems([])
      setError(
        err instanceof ApiError ? err.message : 'Could not load DueList.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, location.key])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const groups = useMemo(() => groupByDate(items), [items])

  return (
    <div className="mx-auto w-full max-w-lg lg:max-w-2xl">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900">DueList</h1>
          <p className="mt-2 text-sm text-slate-600">
            School days with no attendance saved — each missing morning (AM) or
            afternoon (PM) session appears below. Weekends are not listed.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => void load({ silent: true })}
          aria-label={refreshing ? 'Refreshing DueList' : 'Refresh DueList'}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon spinning={refreshing} />
        </button>
      </header>

      {error && (
        <p className={`mb-4 ${errorAlertClass}`} role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-slate-500">Loading missed attendance…</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">
          You&apos;re caught up — no missing AM or PM attendance in the current
          range.
        </p>
      )}

      {!loading && groups.length > 0 && (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.date} aria-labelledby={`due-date-${group.date}`}>
              <h2
                id={`due-date-${group.date}`}
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                {group.label}
              </h2>
              <ul className="flex flex-col gap-3" role="list">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    role="listitem"
                    className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold sm:text-base">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-sm text-amber-900">
                        {item.message}
                      </p>
                    </div>
                    <Link
                      to={item.actionPath}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Take attendance
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
