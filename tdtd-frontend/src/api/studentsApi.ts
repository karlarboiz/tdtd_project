import type { StudentRow, StudentUpsertPayload } from '@/types/schema'
import { apiJson } from '../lib/http'

export function listStudentsByClass(classId: string): Promise<StudentRow[]> {
  const q = new URLSearchParams({ classId })
  return apiJson<StudentRow[]>(`/api/students?${q.toString()}`)
}

export async function registerStudent(
  input: StudentUpsertPayload & { classId: string },
): Promise<StudentRow> {
  console.log('[tdtd register] POST /api/students (single)', {
    classId: input.classId,
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate,
    gender: input.gender,
  })
  try {
    const row = await apiJson<StudentRow>('/api/students', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    console.log('[tdtd register] student registered', {
      id: row.id,
      classId: row.classId,
      name: `${row.firstName} ${row.lastName}`,
    })
    return row
  } catch (e) {
    console.warn('[tdtd register] POST /api/students failed', e)
    throw e
  }
}

export async function registerStudentsBulk(
  classId: string,
  students: StudentUpsertPayload[],
): Promise<StudentRow[]> {
  console.log('[tdtd register] POST /api/students/bulk', {
    classId,
    count: students.length,
    preview: students.slice(0, 3).map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
    })),
  })
  try {
    const rows = await apiJson<StudentRow[]>('/api/students/bulk', {
      method: 'POST',
      body: JSON.stringify({ classId, students }),
    })
    console.log('[tdtd register] bulk OK', {
      classId,
      created: rows.length,
      ids: rows.map((r) => r.id),
    })
    return rows
  } catch (e) {
    console.warn('[tdtd register] POST /api/students/bulk failed', e)
    throw e
  }
}
