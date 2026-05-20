import type { SchoolYearRow, SchoolYearSubjectRow, SubjectRow } from '@/types/schema'
import { apiJson } from '../lib/http'

export function listSchoolYears(): Promise<SchoolYearRow[]> {
  return apiJson<SchoolYearRow[]>('/api/school-years')
}

export function getActiveSchoolYear(): Promise<SchoolYearRow> {
  return apiJson<SchoolYearRow>('/api/school-years/active')
}

export function createSchoolYear(input: {
  label: string
  startDate?: string
  endDate?: string
  setActive?: boolean
}): Promise<SchoolYearRow> {
  return apiJson<SchoolYearRow>('/api/school-years', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function activateSchoolYear(schoolYearId: string): Promise<SchoolYearRow> {
  return apiJson<SchoolYearRow>(`/api/school-years/${schoolYearId}/active`, {
    method: 'PATCH',
  })
}

export function listSchoolYearSubjects(
  schoolYearId: string,
): Promise<SchoolYearSubjectRow[]> {
  return apiJson<SchoolYearSubjectRow[]>(
    `/api/school-years/${schoolYearId}/subjects`,
  )
}

export function registerSchoolYearSubject(
  schoolYearId: string,
  input: {
    subjectId?: string
    name?: string
    shortCode?: string
    gradeLevel: string
  },
): Promise<SchoolYearSubjectRow> {
  return apiJson<SchoolYearSubjectRow>(
    `/api/school-years/${schoolYearId}/subjects`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function unregisterSchoolYearSubject(
  schoolYearId: string,
  registrationId: string,
): Promise<void> {
  return apiJson<void>(
    `/api/school-years/${schoolYearId}/subjects/${registrationId}`,
    { method: 'DELETE' },
  )
}

export function listSubjects(): Promise<SubjectRow[]> {
  return apiJson<SubjectRow[]>('/api/subjects')
}

export function createSubject(input: {
  name: string
  shortCode?: string
}): Promise<SubjectRow> {
  return apiJson<SubjectRow>('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
