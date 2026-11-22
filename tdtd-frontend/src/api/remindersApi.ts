import type { TeacherReminderRow } from '@/types/schema'
import { apiJson } from '../lib/http'

export function listActiveReminders(date?: string): Promise<TeacherReminderRow[]> {
  const q = date ? new URLSearchParams({ date }).toString() : ''
  const path = q ? `/api/reminders/active?${q}` : '/api/reminders/active'
  return apiJson<TeacherReminderRow[]>(path)
}

export function dismissReminder(id: string): Promise<TeacherReminderRow> {
  return apiJson<TeacherReminderRow>(`/api/reminders/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
  })
}
