import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listDueItems } from '@/api/dueListApi'
import { dismissReminder } from '@/api/remindersApi'
import type { DueItem } from '@/types/schema'

export function useDueItems() {
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

  const dismiss = useCallback(
    async (id: string) => {
      try {
        await dismissReminder(id)
        setItems((prev) => prev.filter((i) => i.id !== id))
      } catch {
        void load()
      }
    },
    [load],
  )

  return { items, loading, dismiss, reload: load }
}
