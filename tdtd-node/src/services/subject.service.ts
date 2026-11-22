import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SubjectRow } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as subjectDao from '../dao/subject.dao.js'
import * as studentDao from '../dao/student.dao.js'
import { ACTIVITY_ACTION, recordActivity } from './activityLog.service.js'

export type CreateSubjectInput = {
  name: string
  shortCode?: string
}

export function normalizeSubjectShortCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.trim()
  return s || undefined
}

function assertNameAvailable(
  db: SqliteDatabase,
  name: string,
  excludeSubjectId?: string,
): void {
  const existing = subjectDao.findSubjectByNameInsensitive(db, name)
  if (existing && existing.id !== excludeSubjectId) {
    throw new HttpError(409, `a subject named "${existing.name}" already exists`)
  }
}

function assertShortCodeAvailable(
  db: SqliteDatabase,
  shortCode: string,
  excludeSubjectId?: string,
): void {
  const existing = subjectDao.findSubjectByShortCodeInsensitive(db, shortCode)
  if (existing && existing.id !== excludeSubjectId) {
    throw new HttpError(
      409,
      `short code "${existing.shortCode ?? shortCode}" is already used by "${existing.name}"`,
    )
  }
}

export function listSubjects(db: SqliteDatabase): SubjectRow[] {
  return subjectDao.listSubjects(db)
}

export function createSubject(db: SqliteDatabase, input: CreateSubjectInput): SubjectRow {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode = normalizeSubjectShortCode(input.shortCode)

  assertNameAvailable(db, name)
  if (shortCode) assertShortCodeAvailable(db, shortCode)

  const now = Date.now()
  const row: SubjectRow = {
    id: randomUUID(),
    name,
    shortCode,
    createdAt: now,
  }
  subjectDao.insertSubject(db, row)
  return row
}

/**
 * For school-year registration: reuse catalog row by name (case-insensitive),
 * or create a new subject after duplicate checks.
 */
export function resolveSubjectIdForRegistration(
  db: SqliteDatabase,
  input: CreateSubjectInput,
): string {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode = normalizeSubjectShortCode(input.shortCode)

  const byName = subjectDao.findSubjectByNameInsensitive(db, name)
  if (byName) {
    if (shortCode) {
      assertShortCodeAvailable(db, shortCode, byName.id)
    }
    return byName.id
  }

  if (shortCode) assertShortCodeAvailable(db, shortCode)

  const created = createSubject(db, { name, shortCode })
  return created.id
}

export function assertClassExists(db: SqliteDatabase, classId: string): void {
  if (!studentDao.classExists(db, classId)) {
    throw new HttpError(404, 'class not found')
  }
}

function countLabel(count: number, singular: string, plural: string): string | null {
  if (count <= 0) return null
  return `${count} ${count === 1 ? singular : plural}`
}

function joinLabels(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

export function updateSubject(
  db: SqliteDatabase,
  subjectId: string,
  input: CreateSubjectInput,
): SubjectRow {
  const id = subjectId.trim()
  if (!id) throw new HttpError(400, 'subjectId is required')
  const existing = subjectDao.getSubjectById(db, id)
  if (!existing) throw new HttpError(404, 'subject not found')

  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode = normalizeSubjectShortCode(input.shortCode)

  assertNameAvailable(db, name, id)
  if (shortCode) assertShortCodeAvailable(db, shortCode, id)

  const row: SubjectRow = {
    ...existing,
    name,
    shortCode,
    updatedAt: Date.now(),
  }
  const changes = subjectDao.updateSubject(db, row)
  if (changes === 0) throw new HttpError(404, 'subject not found')

  recordActivity(db, {
    action: ACTIVITY_ACTION.SUBJECT_UPDATED,
    summary: `Updated subject ${name}`,
  })
  return row
}

export function deleteSubject(db: SqliteDatabase, subjectId: string): void {
  const id = subjectId.trim()
  if (!id) throw new HttpError(400, 'subjectId is required')
  const existing = subjectDao.getSubjectById(db, id)
  if (!existing) throw new HttpError(404, 'subject not found')

  const run = db.transaction(() => {
    const usage = subjectDao.getSubjectDeleteUsage(db, id)
    const parts = [
      countLabel(
        usage.schoolYearSubjects,
        'school-year registration',
        'school-year registrations',
      ),
      countLabel(usage.classSubjects, 'class assignment', 'class assignments'),
      countLabel(usage.scoreEvents, 'score event', 'score events'),
    ].filter((part): part is string => part !== null)
    if (parts.length > 0) {
      throw new HttpError(
        409,
        `cannot delete subject: it still has ${joinLabels(parts)}`,
      )
    }
    const changes = subjectDao.deleteSubjectById(db, id)
    if (changes === 0) throw new HttpError(404, 'subject not found')
  })
  run()

  recordActivity(db, {
    action: ACTIVITY_ACTION.SUBJECT_DELETED,
    summary: `Deleted subject ${existing.name}`,
  })
}
