import { apiJson, apiPath } from '@/lib/http'
import { getAccessToken } from '@/lib/authStorage'

export type SchoolSettings = {
  id?: string
  schoolName: string
  schoolId?: string
  district?: string
  division?: string
  region?: string
  schoolAddress?: string
  schoolHeadName?: string
  defaultSchoolYearId?: string
}

export type ComputedSubjectGrade = {
  id: string
  studentId: string
  subjectId: string
  classId: string
  schoolYearId: string
  quarter: number
  rawScore?: number
  transmutedGrade?: number
  descriptor?: string
  finalGrade?: number
  manualOverride?: boolean
  computedAt: number
}

export type ReportForm = 'sf1' | 'sf2' | 'sf4' | 'sf5' | 'sf9' | 'sf10'

export function getSchoolSettings() {
  return apiJson<SchoolSettings | null>('/api/deped/school-settings')
}

export function saveSchoolSettings(body: SchoolSettings) {
  return apiJson<SchoolSettings>('/api/deped/school-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function computeGrades(
  classId: string,
  quarter: number,
  schoolYearId?: string,
): Promise<ComputedSubjectGrade[]> {
  return apiJson<ComputedSubjectGrade[]>(
    `/api/deped/classes/${classId}/grades/compute`,
    {
      method: 'POST',
      body: JSON.stringify({ quarter, schoolYearId }),
    },
  )
}

export function listGrades(
  classId: string,
  quarter?: number,
  schoolYearId?: string,
  subjectId?: string,
): Promise<ComputedSubjectGrade[]> {
  const q = new URLSearchParams()
  if (quarter != null) q.set('quarter', String(quarter))
  if (schoolYearId) q.set('schoolYearId', schoolYearId)
  if (subjectId) q.set('subjectId', subjectId)
  const qs = q.toString()
  return apiJson<ComputedSubjectGrade[]>(
    `/api/deped/classes/${classId}/grades${qs ? `?${qs}` : ''}`,
  )
}

export function autofillReportCards(classId: string, schoolYearId?: string) {
  return apiJson(`/api/deped/classes/${classId}/reports/autofill`, {
    method: 'POST',
    body: JSON.stringify({ schoolYearId }),
  })
}

export async function downloadReport(
  form: ReportForm,
  params: {
    classId?: string
    studentId?: string
    month?: string
    schoolYearId?: string
  },
) {
  const q = new URLSearchParams()
  if (params.classId) q.set('classId', params.classId)
  if (params.studentId) q.set('studentId', params.studentId)
  if (params.month) q.set('month', params.month)
  if (params.schoolYearId) q.set('schoolYearId', params.schoolYearId)

  const url = apiPath(`/api/reports/${form}?${q.toString()}`)
  const headers: HeadersInit = {}
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error('Report download failed')
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `${form}-${params.classId ?? params.studentId ?? 'export'}.pdf`
  a.click()
  URL.revokeObjectURL(objectUrl)
}
