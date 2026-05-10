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

export function insertClass(db: SqliteDatabase, row: ClassRow): void {
  db.prepare(CLASS_QUERIES.insert).run({
    id: row.id,
    name: row.name,
    shift: row.shift,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}
