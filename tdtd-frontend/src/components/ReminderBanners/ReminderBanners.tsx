import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dismissReminder, listActiveReminders } from '@/api/remindersApi'
import { attendanceSessionPath } from '@/lib/attendanceSessionRoute'
import type { TeacherReminderRow } from '@/types/schema'

export function ReminderBanners() {
  const [reminders, setReminders] = useState<TeacherReminderRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listActiveReminders()
      setReminders(rows)
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onDismiss = async (id: string) => {
    try {
      await dismissReminder(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch {
      void load()
    }
  }

  if (loading || reminders.length === 0) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-3" role="status" aria-live="polite">
      {reminders.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium sm:text-base">{r.message}</p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={attendanceSessionPath(r.date, r.period)}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Take attendance
            </Link>
            <button
              type="button"
              onClick={() => void onDismiss(r.id)}
              className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
