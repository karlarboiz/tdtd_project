import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SchoolYearRow } from '../schema/types.js'
import { SCHOOL_YEAR_QUERIES } from '../queries/schoolYear.queries.js'

type SchoolYearDbRow = {
  id: string
  user_id: string
  label: string
  start_date: string | null
  end_date: string | null
  is_active: number
  created_at: number
  updated_at: number | null
}

export function mapSchoolYearRow(row: SchoolYearDbRow): SchoolYearRow {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function listSchoolYears(db: SqliteDatabase, userId: string): SchoolYearRow[] {
  const rows = db.prepare(SCHOOL_YEAR_QUERIES.listAll).all(userId) as SchoolYearDbRow[]
  return rows.map(mapSchoolYearRow)
}

export function getSchoolYearById(
  db: SqliteDatabase,
  id: string,
  userId: string,
): SchoolYearRow | undefined {
  const row = db.prepare(SCHOOL_YEAR_QUERIES.getById).get(id, userId) as
    | SchoolYearDbRow
    | undefined
  return row ? mapSchoolYearRow(row) : undefined
}

export function getActiveSchoolYear(
  db: SqliteDatabase,
  userId: string,
): SchoolYearRow | undefined {
  const row = db.prepare(SCHOOL_YEAR_QUERIES.getActive).get(userId) as
    | SchoolYearDbRow
    | undefined
  return row ? mapSchoolYearRow(row) : undefined
}

export function insertSchoolYear(db: SqliteDatabase, row: SchoolYearRow): void {
  db.prepare(SCHOOL_YEAR_QUERIES.insert).run({
    id: row.id,
    user_id: row.userId,
    label: row.label,
    start_date: row.startDate ?? null,
    end_date: row.endDate ?? null,
    is_active: row.isActive ? 1 : 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}

export function setActiveSchoolYear(
  db: SqliteDatabase,
  userId: string,
  id: string,
  now: number,
): void {
  const run = db.transaction(() => {
    db.prepare(SCHOOL_YEAR_QUERIES.clearActive).run({ user_id: userId, updated_at: now })
    db.prepare(SCHOOL_YEAR_QUERIES.setActive).run({ id, user_id: userId, updated_at: now })
  })
  run()
}

export type SchoolYearSubjectListRow = {
  id: string
  schoolYearId: string
  subjectId: string
  gradeLevel: string
  createdAt: number
  subjectName: string
  subjectShortCode?: string
}

type SchoolYearSubjectDbRow = {
  id: string
  school_year_id: string
  subject_id: string
  grade_level: string
  created_at: number
  subject_name: string
  subject_short_code: string | null
}

export function listSchoolYearSubjects(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
): SchoolYearSubjectListRow[] {
  const rows = db
    .prepare(SCHOOL_YEAR_QUERIES.listRegisteredSubjects)
    .all({ user_id: userId, school_year_id: schoolYearId }) as SchoolYearSubjectDbRow[]
  return rows.map((r) => ({
    id: r.id,
    schoolYearId: r.school_year_id,
    subjectId: r.subject_id,
    gradeLevel: r.grade_level,
    createdAt: r.created_at,
    subjectName: r.subject_name,
    subjectShortCode: r.subject_short_code ?? undefined,
  }))
}

export function insertSchoolYearSubject(
  db: SqliteDatabase,
  row: {
    id: string
    schoolYearId: string
    subjectId: string
    gradeLevel: string
    createdAt: number
  },
): void {
  db.prepare(SCHOOL_YEAR_QUERIES.insertRegistration).run({
    id: row.id,
    school_year_id: row.schoolYearId,
    subject_id: row.subjectId,
    grade_level: row.gradeLevel,
    created_at: row.createdAt,
  })
}

export function schoolYearSubjectExists(
  db: SqliteDatabase,
  schoolYearId: string,
  subjectId: string,
  gradeLevel: string,
): boolean {
  const row = db
    .prepare(SCHOOL_YEAR_QUERIES.registrationExists)
    .get(schoolYearId, subjectId, gradeLevel) as { ok: 1 } | undefined
  return row !== undefined
}

export function getSchoolYearSubjectById(
  db: SqliteDatabase,
  schoolYearId: string,
  registrationId: string,
): { id: string; subjectId: string } | undefined {
  const row = db
    .prepare(SCHOOL_YEAR_QUERIES.getRegistrationById)
    .get(registrationId, schoolYearId) as
    | { id: string; subject_id: string }
    | undefined
  if (!row) return undefined
  return { id: row.id, subjectId: row.subject_id }
}

export function deleteSchoolYearSubjectById(
  db: SqliteDatabase,
  schoolYearId: string,
  registrationId: string,
): { changes: number } {
  const info = db
    .prepare(SCHOOL_YEAR_QUERIES.deleteRegistrationById)
    .run(registrationId, schoolYearId)
  return { changes: info.changes }
}

export function subjectUsedInClassOrScores(
  db: SqliteDatabase,
  userId: string,
  subjectId: string,
): boolean {
  const row = db
    .prepare(SCHOOL_YEAR_QUERIES.subjectUsedInClassOrScores)
    .get(userId, subjectId, userId, subjectId) as { ok: 1 } | undefined
  return row !== undefined
}

export function isSubjectRegisteredForActiveYear(
  db: SqliteDatabase,
  userId: string,
  subjectId: string,
): boolean {
  const row = db
    .prepare(SCHOOL_YEAR_QUERIES.isSubjectRegisteredForActiveYear)
    .get(userId, subjectId) as { ok: 1 } | undefined
  return row !== undefined
}
