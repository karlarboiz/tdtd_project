import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SubjectRow } from '../schema/types.js'
import { SUBJECT_QUERIES } from '../queries/subject.queries.js'

type SubjectDbRow = {
  id: string
  name: string
  short_code: string | null
  created_at: number
  updated_at: number | null
}

export function mapSubjectRow(row: SubjectDbRow): SubjectRow {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function listSubjects(db: SqliteDatabase): SubjectRow[] {
  const rows = db.prepare(SUBJECT_QUERIES.listByName).all() as SubjectDbRow[]
  return rows.map(mapSubjectRow)
}

export function findSubjectByNameInsensitive(
  db: SqliteDatabase,
  name: string,
): SubjectRow | undefined {
  const row = db.prepare(SUBJECT_QUERIES.getByNameInsensitive).get(name) as
    | SubjectDbRow
    | undefined
  return row ? mapSubjectRow(row) : undefined
}

export function findSubjectByShortCodeInsensitive(
  db: SqliteDatabase,
  shortCode: string,
): SubjectRow | undefined {
  const row = db.prepare(SUBJECT_QUERIES.getByShortCodeInsensitive).get(shortCode) as
    | SubjectDbRow
    | undefined
  return row ? mapSubjectRow(row) : undefined
}

export function insertSubject(db: SqliteDatabase, row: SubjectRow): void {
  db.prepare(SUBJECT_QUERIES.insert).run({
    id: row.id,
    name: row.name,
    short_code: row.shortCode ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}

export function getSubjectById(
  db: SqliteDatabase,
  id: string,
): SubjectRow | undefined {
  const row = db.prepare(SUBJECT_QUERIES.getById).get(id) as
    | SubjectDbRow
    | undefined
  return row ? mapSubjectRow(row) : undefined
}

export function updateSubject(db: SqliteDatabase, row: SubjectRow): number {
  const result = db.prepare(SUBJECT_QUERIES.update).run({
    id: row.id,
    name: row.name,
    short_code: row.shortCode ?? null,
    updated_at: row.updatedAt ?? null,
  })
  return Number(result.changes)
}

export function deleteSubjectById(db: SqliteDatabase, id: string): number {
  const result = db.prepare(SUBJECT_QUERIES.deleteById).run(id)
  return Number(result.changes)
}

export type SubjectDeleteUsage = {
  schoolYearSubjects: number
  classSubjects: number
  scoreEvents: number
}

export function getSubjectDeleteUsage(
  db: SqliteDatabase,
  id: string,
): SubjectDeleteUsage {
  const row = db.prepare(SUBJECT_QUERIES.deleteUsage).get(id, id, id) as {
    school_year_subjects: number
    class_subjects: number
    score_events: number
  }
  return {
    schoolYearSubjects: Number(row.school_year_subjects),
    classSubjects: Number(row.class_subjects),
    scoreEvents: Number(row.score_events),
  }
}

export function subjectExists(db: SqliteDatabase, id: string): boolean {
  const row = db
    .prepare(`SELECT 1 AS ok FROM subjects WHERE id = ? LIMIT 1`)
    .get(id) as { ok: 1 } | undefined
  return row !== undefined
}
