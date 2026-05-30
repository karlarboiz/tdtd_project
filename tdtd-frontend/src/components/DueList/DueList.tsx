import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listDueItems } from '@/api/dueListApi'
import { dismissReminder } from '@/api/remindersApi'
import type { DueItem } from '@/types/schema'

type DueListProps = {
  variant?: 'default' | 'compact'
}

export function DueList({ variant = 'default' }: DueListProps) {
  const location = useLocation()
  const [items, setItems] = useState<DueItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listDueItems()
      setItems(rows)
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

  const onDismiss = async (id: string) => {
    try {
      await dismissReminder(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      void load()
    }
  }

  if (loading || items.length === 0) {
    return null
  }

  const headingClass =
    variant === 'compact'
      ? 'text-sm font-semibold text-amber-950'
      : 'text-base font-semibold text-amber-950'

  return (
    <section
      className="flex w-full flex-col gap-3"
      aria-labelledby="due-list-heading"
    >
      <h2 id="due-list-heading" className={headingClass}>
        Due
      </h2>
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
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Do it
              </Link>
              <button
                type="button"
                onClick={() => void onDismiss(item.id)}
                className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
