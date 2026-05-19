import type { ClassRow, ClassShift } from '@/types/schema'
import { apiJson } from '../lib/http'

export function listClasses(): Promise<ClassRow[]> {
  return apiJson<ClassRow[]>('/api/classes')
}

export async function createClass(input: {
  name: string
  shift: ClassShift
}): Promise<ClassRow> {
  console.log('[tdtd register] POST /api/classes', input)
  try {
    const row = await apiJson<ClassRow>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    console.log('[tdtd register] class created', {
      id: row.id,
      name: row.name,
      shift: row.shift,
    })
    return row
  } catch (e) {
    console.warn('[tdtd register] POST /api/classes failed', e)
    throw e
  }
}
