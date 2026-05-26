import type { StudentLabPayload, StudentLabProfile } from '@/types/schema'
import { apiJson } from '../lib/http'

export type StudentLabQuery = {
  from?: string
  to?: string
  scoresFrom?: string
  scoresTo?: string
}

function buildLabQuery(params: StudentLabQuery): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.scoresFrom) q.set('scoresFrom', params.scoresFrom)
  if (params.scoresTo) q.set('scoresTo', params.scoresTo)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function getStudentProfile(studentId: string): Promise<StudentLabProfile> {
  return apiJson<StudentLabProfile>(
    `/api/students/${encodeURIComponent(studentId)}`,
  )
}

export function getStudentLab(
  studentId: string,
  params: StudentLabQuery = {},
): Promise<StudentLabPayload> {
  return apiJson<StudentLabPayload>(
    `/api/students/${encodeURIComponent(studentId)}/lab${buildLabQuery(params)}`,
  )
}
