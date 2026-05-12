import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ClassSubjectRow } from '../schema/types.js'
import { CLASS_SUBJECT_QUERIES } from '../queries/classSubject.queries.js'

export type ClassSubjectListRow = ClassSubjectRow & {
  subjectName: string
  subjectShortCode?: string
}

type ClassSubjectDbRow = {
  id: string
  class_id: string
  subject_id: string
  created_at: number
  subject_name: string
  subject_short_code: string | null
}

export function listClassSubjects(
  db: SqliteDatabase,
  classId: string,
): ClassSubjectListRow[] {
  const rows = db
    .prepare(CLASS_SUBJECT_QUERIES.listByClass)
    .all(classId) as ClassSubjectDbRow[]
  return rows.map((r) => ({
    id: r.id,
    classId: r.class_id,
    subjectId: r.subject_id,
    createdAt: r.created_at,
    subjectName: r.subject_name,
    subjectShortCode: r.subject_short_code ?? undefined,
  }))
}

export function insertClassSubject(
  db: SqliteDatabase,
  row: ClassSubjectRow,
): void {
  db.prepare(CLASS_SUBJECT_QUERIES.insert).run({
    id: row.id,
    class_id: row.classId,
    subject_id: row.subjectId,
    created_at: row.createdAt,
  })
}

export function deleteClassSubject(
  db: SqliteDatabase,
  classId: string,
  subjectId: string,
): { changes: number } {
  const info = db.prepare(CLASS_SUBJECT_QUERIES.deletePair).run({
    class_id: classId,
    subject_id: subjectId,
  })
  return { changes: info.changes }
}

export function classSubjectPairExists(
  db: SqliteDatabase,
  classId: string,
  subjectId: string,
): boolean {
  const row = db
    .prepare(CLASS_SUBJECT_QUERIES.existsPair)
    .get(classId, subjectId) as { ok: 1 } | undefined
  return row !== undefined
}
