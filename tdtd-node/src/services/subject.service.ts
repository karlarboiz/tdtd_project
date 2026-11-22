import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SubjectRow } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as subjectDao from '../dao/subject.dao.js'
import { assertClassOwned } from '../lib/ownership.js'

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
  userId: string,
  name: string,
  excludeSubjectId?: string,
): void {
  const existing = subjectDao.findSubjectByNameInsensitive(db, userId, name)
  if (existing && existing.id !== excludeSubjectId) {
    throw new HttpError(409, `a subject named "${existing.name}" already exists`)
  }
}

function assertShortCodeAvailable(
  db: SqliteDatabase,
  userId: string,
  shortCode: string,
  excludeSubjectId?: string,
): void {
  const existing = subjectDao.findSubjectByShortCodeInsensitive(db, userId, shortCode)
  if (existing && existing.id !== excludeSubjectId) {
    throw new HttpError(
      409,
      `short code "${existing.shortCode ?? shortCode}" is already used by "${existing.name}"`,
    )
  }
}

export function listSubjects(db: SqliteDatabase, userId: string): SubjectRow[] {
  return subjectDao.listSubjects(db, userId)
}

export function createSubject(
  db: SqliteDatabase,
  userId: string,
  input: CreateSubjectInput,
): SubjectRow {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode = normalizeSubjectShortCode(input.shortCode)

  assertNameAvailable(db, userId, name)
  if (shortCode) assertShortCodeAvailable(db, userId, shortCode)

  const now = Date.now()
  const row: SubjectRow = {
    id: randomUUID(),
    userId,
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
  userId: string,
  input: CreateSubjectInput,
): string {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode = normalizeSubjectShortCode(input.shortCode)

  const byName = subjectDao.findSubjectByNameInsensitive(db, userId, name)
  if (byName) {
    if (shortCode) {
      assertShortCodeAvailable(db, userId, shortCode, byName.id)
    }
    return byName.id
  }

  if (shortCode) assertShortCodeAvailable(db, userId, shortCode)

  const created = createSubject(db, userId, { name, shortCode })
  return created.id
}

export function assertClassExists(
  db: SqliteDatabase,
  classId: string,
  userId: string,
): void {
  assertClassOwned(db, classId, userId)
}
