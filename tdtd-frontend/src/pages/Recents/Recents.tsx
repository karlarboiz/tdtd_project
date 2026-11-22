import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'
import { RecentsSkeleton } from '@/components/LoadingSkeleton/RecentsSkeleton'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { listRecents } from '../../api/recentsApi'
import { activityLogHref } from '../../lib/activityLinks'
import { formatRecordedAt, toYMD } from '../../lib/dates'
import { ApiError } from '../../lib/http'
import { Button } from '@/components/Button/Button'
import { errorAlertClass } from '@/lib/uiClasses'
import type { ActivityLogRow } from '@/types/schema'

type DayGroup = {
  label: string
  items: ActivityLogRow[]
}

function dayGroupLabel(createdAt: number, todayYmd: string): string {
  const d = new Date(createdAt)
  const ymd = toYMD(d)
  if (ymd === todayYmd) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (ymd === toYMD(yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function groupByDay(items: ActivityLogRow[]): DayGroup[] {
  const todayYmd = toYMD(new Date())
  const groups: DayGroup[] = []
  let currentLabel: string | null = null

  for (const item of items) {
    const label = dayGroupLabel(item.createdAt, todayYmd)
    if (label !== currentLabel) {
      groups.push({ label, items: [item] })
      currentLabel = label
    } else {
      groups[groups.length - 1]!.items.push(item)
    }
  }
  return groups
}

export function Recents() {
  const location = useLocation()
  const [items, setItems] = useState<ActivityLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      setItems(await listRecents())
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load recents.',
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
      if (document.visibilityState === 'visible') {
        void load({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const groups = useMemo(() => groupByDay(items), [items])

  return (
    <PageContainer>
      <PageContentReveal>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Recents</h1>
          <p className="mt-1 text-sm text-slate-600">
            A log of things you&apos;ve done in Teacher&apos;s Dilemma Today —
            saving attendance, registering students, recording scores, and more.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={loading || refreshing}
          onClick={() => void load({ silent: true })}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {error ? (
        <p className={`mt-4 ${errorAlertClass}`} role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <RecentsSkeleton className="mt-6" />
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
          No activity yet. Actions like saving attendance or registering students
          will appear here.
        </p>
      ) : (
        <ContentReveal revealKey="recents-ready">
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section
              key={group.label}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                {group.label}
              </h2>
              <ul className="divide-y divide-slate-100">
                {group.items.map((item) => {
                  const href = activityLogHref(item.metadata)
                  return (
                    <li key={item.id} className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900">
                        {item.summary}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRecordedAt(item.createdAt)}
                      </p>
                      {href ? (
                        <Link
                          to={href}
                          className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                        >
                          View related
                        </Link>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
        </ContentReveal>
      )}
      </PageContentReveal>
    </PageContainer>
  )
}
