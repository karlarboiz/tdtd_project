import type { ActivityLogRow } from '@/types/schema'
import { apiJson } from '../lib/http'

export function listRecents(limit = 100): Promise<ActivityLogRow[]> {
  const q = new URLSearchParams({ limit: String(limit) }).toString()
  return apiJson<ActivityLogRow[]>(`/api/recents?${q}`)
}
