import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { SubjectRow } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as subjectDao from '../dao/subject.dao.js'
import * as studentDao from '../dao/student.dao.js'

export type CreateSubjectInput = {
  name: string
  shortCode?: string
}

export function listSubjects(db: SqliteDatabase): SubjectRow[] {
  return subjectDao.listSubjects(db)
}

export function createSubject(db: SqliteDatabase, input: CreateSubjectInput): SubjectRow {
  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shortCode =
    typeof input.shortCode === 'string' && input.shortCode.trim()
      ? input.shortCode.trim()
      : undefined

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

export function assertClassExists(db: SqliteDatabase, classId: string): void {
  if (!studentDao.classExists(db, classId)) {
    throw new HttpError(404, 'class not found')
  }
}
