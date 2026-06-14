import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ClassRow, ClassShift } from '../schema/types.js'
import { CLASS_QUERIES } from '../queries/class.queries.js'

type ClassDbRow = {
  id: string
  name: string
  shift: ClassShift
  grade_level: string | null
  section_name: string | null
  class_adviser_name: string | null
  created_at: number
  updated_at: number | null
}

export function mapClassRow(row: ClassDbRow): ClassRow {
  return {
    id: row.id,
    name: row.name,
    shift: row.shift,
    gradeLevel: row.grade_level ?? undefined,
    sectionName: row.section_name ?? undefined,
    classAdviserName: row.class_adviser_name ?? undefined,
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
    grade_level: row.gradeLevel ?? null,
    section_name: row.sectionName ?? null,
    class_adviser_name: row.classAdviserName ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}

export function updateClassMetadata(
  db: SqliteDatabase,
  classId: string,
  meta: Pick<ClassRow, 'gradeLevel' | 'sectionName' | 'classAdviserName'>,
): void {
  db.prepare(CLASS_QUERIES.updateMetadata).run({
    id: classId,
    grade_level: meta.gradeLevel ?? null,
    section_name: meta.sectionName ?? null,
    class_adviser_name: meta.classAdviserName ?? null,
    updated_at: Date.now(),
  })
}
