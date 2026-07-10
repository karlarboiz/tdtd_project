import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SubjectRow } from '../schema/types.js'
import { SUBJECT_QUERIES } from '../queries/subject.queries.js'

type SubjectDbRow = {
  id: string
  user_id: string
  name: string
  short_code: string | null
  created_at: number
  updated_at: number | null
}

export function mapSubjectRow(row: SubjectDbRow): SubjectRow {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    shortCode: row.short_code ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function listSubjects(db: SqliteDatabase, userId: string): SubjectRow[] {
  const rows = db.prepare(SUBJECT_QUERIES.listByName).all(userId) as SubjectDbRow[]
  return rows.map(mapSubjectRow)
}

export function findSubjectByNameInsensitive(
  db: SqliteDatabase,
  userId: string,
  name: string,
): SubjectRow | undefined {
  const row = db.prepare(SUBJECT_QUERIES.getByNameInsensitive).get(userId, name) as
    | SubjectDbRow
    | undefined
  return row ? mapSubjectRow(row) : undefined
}

export function findSubjectByShortCodeInsensitive(
  db: SqliteDatabase,
  userId: string,
  shortCode: string,
): SubjectRow | undefined {
  const row = db.prepare(SUBJECT_QUERIES.getByShortCodeInsensitive).get(userId, shortCode) as
    | SubjectDbRow
    | undefined
  return row ? mapSubjectRow(row) : undefined
}

export function insertSubject(db: SqliteDatabase, row: SubjectRow): void {
  db.prepare(SUBJECT_QUERIES.insert).run({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    short_code: row.shortCode ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}

export function subjectExists(db: SqliteDatabase, id: string, userId: string): boolean {
  const row = db.prepare(SUBJECT_QUERIES.exists).get(id, userId) as
    | { ok: 1 }
    | undefined
  return row !== undefined
}
