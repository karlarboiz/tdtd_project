import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { StudentGenderCode, StudentRow } from '../schema/types.js'
import { STUDENT_QUERIES } from '../queries/student.queries.js'

type StudentDbRow = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  birth_date: string
  gender: StudentGenderCode
  class_id: string
  created_at: number
}

export function classExists(db: SqliteDatabase, classId: string): boolean {
  const row = db.prepare(STUDENT_QUERIES.classExists).get(classId) as
    | { ok: 1 }
    | undefined
  return row !== undefined
}

export function insertStudent(db: SqliteDatabase, row: StudentRow): void {
  db.prepare(STUDENT_QUERIES.insert).run({
    id: row.id,
    first_name: row.firstName,
    middle_name: row.middleName ?? null,
    last_name: row.lastName,
    birth_date: row.birthDate,
    gender: row.gender,
    class_id: row.classId,
    created_at: row.createdAt,
  })
}

export function getClassIdForStudent(
  db: SqliteDatabase,
  studentId: string,
): string | undefined {
  const row = db.prepare(STUDENT_QUERIES.classIdByStudentId).get(studentId) as
    | { class_id: string }
    | undefined
  return row?.class_id
}

function mapStudentDbRow(r: StudentDbRow): StudentRow {
  return {
    id: r.id,
    firstName: r.first_name,
    middleName: r.middle_name ?? undefined,
    lastName: r.last_name,
    birthDate: r.birth_date,
    gender: r.gender,
    classId: r.class_id,
    createdAt: r.created_at,
  }
}

export function getStudentById(
  db: SqliteDatabase,
  studentId: string,
): StudentRow | undefined {
  const row = db.prepare(STUDENT_QUERIES.getById).get(studentId) as
    | StudentDbRow
    | undefined
  return row ? mapStudentDbRow(row) : undefined
}

export function listStudentsByClass(
  db: SqliteDatabase,
  classId: string,
): StudentRow[] {
  const rows = db.prepare(STUDENT_QUERIES.listByClass).all(classId) as StudentDbRow[]
  return rows.map(mapStudentDbRow)
}
