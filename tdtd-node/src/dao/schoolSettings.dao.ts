import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SchoolSettingsRow } from '../schema/types.js'
import { SCHOOL_SETTINGS_QUERIES } from '../queries/schoolSettings.queries.js'

type DbRow = {
  id: string
  user_id: string
  school_name: string
  school_id: string | null
  district: string | null
  division: string | null
  region: string | null
  school_address: string | null
  school_head_name: string | null
  default_school_year_id: string | null
  updated_at: number
}

function mapRow(r: DbRow): SchoolSettingsRow {
  return {
    id: r.id,
    userId: r.user_id,
    schoolName: r.school_name,
    schoolId: r.school_id ?? undefined,
    district: r.district ?? undefined,
    division: r.division ?? undefined,
    region: r.region ?? undefined,
    schoolAddress: r.school_address ?? undefined,
    schoolHeadName: r.school_head_name ?? undefined,
    defaultSchoolYearId: r.default_school_year_id ?? undefined,
    updatedAt: r.updated_at,
  }
}

export function getSchoolSettings(
  db: SqliteDatabase,
  userId: string,
): SchoolSettingsRow | undefined {
  const row = db.prepare(SCHOOL_SETTINGS_QUERIES.get).get(userId) as DbRow | undefined
  return row ? mapRow(row) : undefined
}

export function upsertSchoolSettings(
  db: SqliteDatabase,
  row: SchoolSettingsRow,
): SchoolSettingsRow {
  db.prepare(SCHOOL_SETTINGS_QUERIES.upsert).run({
    id: row.id,
    user_id: row.userId,
    school_name: row.schoolName,
    school_id: row.schoolId ?? null,
    district: row.district ?? null,
    division: row.division ?? null,
    region: row.region ?? null,
    school_address: row.schoolAddress ?? null,
    school_head_name: row.schoolHeadName ?? null,
    default_school_year_id: row.defaultSchoolYearId ?? null,
    updated_at: row.updatedAt,
  })
  return row
}
