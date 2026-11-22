import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ClassRow, ClassShift } from '../schema/types.js'
import { CLASS_QUERIES } from '../queries/class.queries.js'

type ClassDbRow = {
  id: string
  name: string
  shift: ClassShift
  created_at: number
  updated_at: number | null
}

export function mapClassRow(row: ClassDbRow): ClassRow {
  return {
    id: row.id,
    name: row.name,
    shift: row.shift,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function listClasses(db: SqliteDatabase): ClassRow[] {
  const rows = db.prepare(CLASS_QUERIES.listByName).all() as ClassDbRow[]
  return rows.map(mapClassRow)
}

export function getClassById(
  db: SqliteDatabase,
  id: string,
): ClassRow | undefined {
  const row = db.prepare(CLASS_QUERIES.getById).get(id) as ClassDbRow | undefined
  return row ? mapClassRow(row) : undefined
}

export function insertClass(db: SqliteDatabase, row: ClassRow): void {
  db.prepare(CLASS_QUERIES.insert).run({
    id: row.id,
    name: row.name,
    shift: row.shift,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}

export function updateClass(db: SqliteDatabase, row: ClassRow): number {
  const result = db.prepare(CLASS_QUERIES.update).run({
    id: row.id,
    name: row.name,
    shift: row.shift,
    updated_at: row.updatedAt ?? null,
  })
  return Number(result.changes)
}

export function deleteClassById(db: SqliteDatabase, id: string): number {
  const result = db.prepare(CLASS_QUERIES.deleteById).run(id)
  return Number(result.changes)
}

export type ClassDeleteUsage = {
  students: number
  classSubjects: number
  scoreEvents: number
}

export function getClassDeleteUsage(
  db: SqliteDatabase,
  id: string,
): ClassDeleteUsage {
  const row = db.prepare(CLASS_QUERIES.deleteUsage).get(id, id, id) as {
    students: number
    class_subjects: number
    score_events: number
  }
  return {
    students: Number(row.students),
    classSubjects: Number(row.class_subjects),
    scoreEvents: Number(row.score_events),
  }
}
