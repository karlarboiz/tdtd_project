import type { DueItem } from '@/types/schema'
import { apiJson } from '@/lib/http'

export function listDueItems(date?: string): Promise<DueItem[]> {
  const q = date ? `date=${encodeURIComponent(date)}` : ''
  const path = q ? `/api/due-list?${q}` : '/api/due-list'
  return apiJson<DueItem[]>(path)
}

export function listMissedDueItems(params?: {
  from?: string
  to?: string
}): Promise<DueItem[]> {
  const q = new URLSearchParams()
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  const qs = q.toString()
  const path = qs ? `/api/due-list/missed?${qs}` : '/api/due-list/missed'
  return apiJson<DueItem[]>(path)
}
