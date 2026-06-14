import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SchoolSettingsRow } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as dao from '../dao/schoolSettings.dao.js'

export type SchoolSettingsInput = {
  schoolName: string
  schoolId?: string
  district?: string
  division?: string
  region?: string
  schoolAddress?: string
  schoolHeadName?: string
  defaultSchoolYearId?: string
}

export function getSchoolSettings(db: SqliteDatabase): SchoolSettingsRow | undefined {
  return dao.getSchoolSettings(db)
}

export function saveSchoolSettings(
  db: SqliteDatabase,
  input: SchoolSettingsInput,
): SchoolSettingsRow {
  const name = input.schoolName?.trim()
  if (!name) throw new HttpError(400, 'schoolName is required')

  const existing = dao.getSchoolSettings(db)
  const row: SchoolSettingsRow = {
    id: existing?.id ?? randomUUID(),
    schoolName: name,
    schoolId: input.schoolId?.trim() || undefined,
    district: input.district?.trim() || undefined,
    division: input.division?.trim() || undefined,
    region: input.region?.trim() || undefined,
    schoolAddress: input.schoolAddress?.trim() || undefined,
    schoolHeadName: input.schoolHeadName?.trim() || undefined,
    defaultSchoolYearId: input.defaultSchoolYearId?.trim() || undefined,
    updatedAt: Date.now(),
  }
  return dao.upsertSchoolSettings(db, row)
}
