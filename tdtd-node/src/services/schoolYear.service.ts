import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { IsoDateString, SchoolYearRow } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as schoolYearDao from '../dao/schoolYear.dao.js'
import type { SchoolYearSubjectListRow } from '../dao/schoolYear.dao.js'
import * as subjectDao from '../dao/subject.dao.js'
import {
  normalizeSubjectShortCode,
  resolveSubjectIdForRegistration,
} from './subject.service.js'
import { ACTIVITY_ACTION, recordActivity } from './activityLog.service.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SY_LABEL = /^\d{4}-\d{4}$/

function parseOptionalDate(raw: unknown, field: string): IsoDateString | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'string') {
    throw new HttpError(400, `${field} must be a string YYYY-MM-DD`)
  }
  const s = raw.trim()
  if (!s) return undefined
  if (!ISO_DATE.test(s)) {
    throw new HttpError(400, `${field} must be YYYY-MM-DD`)
  }
  return s as IsoDateString
}

export function listSchoolYears(db: SqliteDatabase, userId: string): SchoolYearRow[] {
  return schoolYearDao.listSchoolYears(db, userId)
}

export function getActiveSchoolYear(db: SqliteDatabase, userId: string): SchoolYearRow {
  const row = schoolYearDao.getActiveSchoolYear(db, userId)
  if (!row) {
    throw new HttpError(404, 'no active school year; create one and set it active')
  }
  return row
}

export type CreateSchoolYearInput = {
  label?: unknown
  startDate?: unknown
  endDate?: unknown
  setActive?: unknown
}

export function createSchoolYear(
  db: SqliteDatabase,
  userId: string,
  input: CreateSchoolYearInput,
): SchoolYearRow {
  const label =
    typeof input.label === 'string' && input.label.trim()
      ? input.label.trim()
      : ''
  if (!label) throw new HttpError(400, 'label is required')
  if (!SY_LABEL.test(label)) {
    throw new HttpError(400, 'label should match YYYY-YYYY (e.g. 2025-2026)')
  }

  const startDate = parseOptionalDate(input.startDate, 'startDate')
  const endDate = parseOptionalDate(input.endDate, 'endDate')
  const setActive = input.setActive === true || input.setActive === 'true'
  const now = Date.now()

  const row: SchoolYearRow = {
    id: randomUUID(),
    userId,
    label,
    startDate,
    endDate,
    isActive: false,
    createdAt: now,
  }

  schoolYearDao.insertSchoolYear(db, row)

  if (setActive) {
    schoolYearDao.setActiveSchoolYear(db, userId, row.id, now)
  }

  const saved = schoolYearDao.getSchoolYearById(db, row.id, userId) ?? row
  recordActivity(db, userId, {
    action: ACTIVITY_ACTION.SCHOOL_YEAR_CREATED,
    summary: `Created school year ${saved.label}`,
    metadata: { schoolYearId: saved.id },
  })
  if (saved.isActive) {
    recordActivity(db, userId, {
      action: ACTIVITY_ACTION.SCHOOL_YEAR_ACTIVATED,
      summary: `Set active school year to ${saved.label}`,
      metadata: { schoolYearId: saved.id },
    })
  }
  return saved
}

export function activateSchoolYear(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
): SchoolYearRow {
  const id = schoolYearId.trim()
  if (!id) throw new HttpError(400, 'schoolYearId is required')
  const existing = schoolYearDao.getSchoolYearById(db, id, userId)
  if (!existing) throw new HttpError(404, 'school year not found')

  const now = Date.now()
  schoolYearDao.setActiveSchoolYear(db, userId, id, now)
  const updated = schoolYearDao.getSchoolYearById(db, id, userId) ?? existing
  recordActivity(db, userId, {
    action: ACTIVITY_ACTION.SCHOOL_YEAR_ACTIVATED,
    summary: `Set active school year to ${updated.label}`,
    metadata: { schoolYearId: updated.id },
  })
  return updated
}

export function getSchoolYearOrThrow(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
): SchoolYearRow {
  const id = schoolYearId.trim()
  if (!id) throw new HttpError(400, 'schoolYearId is required')
  const row = schoolYearDao.getSchoolYearById(db, id, userId)
  if (!row) throw new HttpError(404, 'school year not found')
  return row
}

export function listRegisteredSubjects(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
): SchoolYearSubjectListRow[] {
  getSchoolYearOrThrow(db, userId, schoolYearId)
  return schoolYearDao.listSchoolYearSubjects(db, userId, schoolYearId)
}

function parseGradeLevel(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) throw new HttpError(400, 'gradeLevel is required')
  return s
}

export type RegisterSubjectInput = {
  subjectId?: unknown
  name?: unknown
  shortCode?: unknown
  gradeLevel?: unknown
}

export function registerSubjectForSchoolYear(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
  input: RegisterSubjectInput,
): SchoolYearSubjectListRow {
  getSchoolYearOrThrow(db, userId, schoolYearId)
  const gradeLevel = parseGradeLevel(input.gradeLevel)

  let subjectId =
    typeof input.subjectId === 'string' ? input.subjectId.trim() : ''

  if (!subjectId) {
    const name = typeof input.name === 'string' ? input.name : ''
    subjectId = resolveSubjectIdForRegistration(db, userId, {
      name,
      shortCode: normalizeSubjectShortCode(input.shortCode),
    })
  } else if (!subjectDao.subjectExists(db, subjectId, userId)) {
    throw new HttpError(404, 'subject not found')
  }

  if (schoolYearDao.schoolYearSubjectExists(db, schoolYearId, subjectId, gradeLevel)) {
    throw new HttpError(
      409,
      'this subject and grade level are already registered for this school year',
    )
  }

  const regId = randomUUID()
  const now = Date.now()
  schoolYearDao.insertSchoolYearSubject(db, {
    id: regId,
    schoolYearId,
    subjectId,
    gradeLevel,
    createdAt: now,
  })

  const list = schoolYearDao.listSchoolYearSubjects(db, userId, schoolYearId)
  const found = list.find((x) => x.id === regId)
  if (!found) throw new HttpError(500, 'failed to load school year subject')
  recordActivity(db, userId, {
    action: ACTIVITY_ACTION.SUBJECT_REGISTERED,
    summary: `Registered ${found.subjectName} for ${gradeLevel}`,
    metadata: { schoolYearId },
  })
  return found
}

export function unregisterSubjectFromSchoolYear(
  db: SqliteDatabase,
  userId: string,
  schoolYearId: string,
  registrationId: string,
): void {
  getSchoolYearOrThrow(db, userId, schoolYearId)
  const rid = registrationId.trim()
  if (!rid) throw new HttpError(400, 'registrationId is required')

  const reg = schoolYearDao.getSchoolYearSubjectById(db, schoolYearId, rid)
  if (!reg) {
    throw new HttpError(404, 'subject registration not found for this school year')
  }

  const listed = schoolYearDao
    .listSchoolYearSubjects(db, userId, schoolYearId)
    .find((x) => x.id === rid)
  if (!listed) {
    throw new HttpError(404, 'subject registration not found for this school year')
  }

  if (schoolYearDao.subjectUsedInClassOrScores(db, userId, reg.subjectId)) {
    throw new HttpError(
      409,
      'cannot unregister: subject is assigned to a class or used in score events',
    )
  }

  const { changes } = schoolYearDao.deleteSchoolYearSubjectById(db, schoolYearId, rid)
  if (changes === 0) {
    throw new HttpError(404, 'subject registration not found for this school year')
  }

  recordActivity(db, userId, {
    action: ACTIVITY_ACTION.SUBJECT_UNREGISTERED,
    summary: `Removed ${listed.subjectName} (${listed.gradeLevel}) from school year`,
    metadata: { schoolYearId },
  })
}

/** Used when assigning a subject to a class. */
export function assertSubjectRegisteredForActiveYear(
  db: SqliteDatabase,
  userId: string,
  subjectId: string,
): void {
  if (!schoolYearDao.getActiveSchoolYear(db, userId)) {
    throw new HttpError(
      400,
      'no active school year; create one and register subjects first',
    )
  }
  if (!schoolYearDao.isSubjectRegisteredForActiveYear(db, userId, subjectId)) {
    throw new HttpError(
      400,
      'subject must be registered for the active school year before assigning to a class',
    )
  }
}
