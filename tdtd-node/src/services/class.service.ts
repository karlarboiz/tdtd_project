import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ClassRow, ClassShift } from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as classDao from '../dao/class.dao.js'
import { ACTIVITY_ACTION, recordActivity } from './activityLog.service.js'

export type CreateClassInput = {
  name: string
  shift: string
}

function parseClassShift(raw: string): ClassShift {
  const s = raw.trim()
  if (!s) throw new HttpError(400, 'shift is required')
  if (s === 'MRNG' || s === 'AFTNN') return s
  throw new HttpError(400, 'shift must be MRNG or AFTNN')
}

export function listClasses(db: SqliteDatabase): ClassRow[] {
  return classDao.listClasses(db)
}

export function createClass(db: SqliteDatabase, input: CreateClassInput): ClassRow {
  const name = input.name.trim()
  const shift = parseClassShift(typeof input.shift === 'string' ? input.shift : '')
  if (!name) throw new HttpError(400, 'name is required')

  const row: ClassRow = {
    id: randomUUID(),
    name,
    shift,
    createdAt: Date.now(),
  }
  classDao.insertClass(db, row)
  const shiftLabel = shift === 'MRNG' ? 'morning' : 'afternoon'
  recordActivity(db, {
    action: ACTIVITY_ACTION.CLASS_CREATED,
    summary: `Created class ${name} (${shiftLabel})`,
    metadata: { classId: row.id },
  })
  return row
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

export function updateClass(
  db: SqliteDatabase,
  classId: string,
  input: CreateClassInput,
): ClassRow {
  const id = classId.trim()
  if (!id) throw new HttpError(400, 'classId is required')
  const existing = classDao.getClassById(db, id)
  if (!existing) throw new HttpError(404, 'class not found')

  const name = input.name.trim()
  if (!name) throw new HttpError(400, 'name is required')
  const shift = parseClassShift(typeof input.shift === 'string' ? input.shift : '')

  const row: ClassRow = {
    ...existing,
    name,
    shift,
    updatedAt: Date.now(),
  }
  const changes = classDao.updateClass(db, row)
  if (changes === 0) throw new HttpError(404, 'class not found')

  const shiftLabel = shift === 'MRNG' ? 'morning' : 'afternoon'
  recordActivity(db, {
    action: ACTIVITY_ACTION.CLASS_UPDATED,
    summary: `Updated class ${name} (${shiftLabel})`,
    metadata: { classId: row.id },
  })
  return row
}

export function deleteClass(db: SqliteDatabase, classId: string): void {
  const id = classId.trim()
  if (!id) throw new HttpError(400, 'classId is required')
  const existing = classDao.getClassById(db, id)
  if (!existing) throw new HttpError(404, 'class not found')

  const run = db.transaction(() => {
    const usage = classDao.getClassDeleteUsage(db, id)
    const parts = [
      countLabel(usage.students, 'student', 'students'),
      countLabel(usage.classSubjects, 'assigned subject', 'assigned subjects'),
      countLabel(usage.scoreEvents, 'score event', 'score events'),
    ].filter((part): part is string => part !== null)
    if (parts.length > 0) {
      throw new HttpError(
        409,
        `cannot delete class: it still has ${joinLabels(parts)}`,
      )
    }
    const changes = classDao.deleteClassById(db, id)
    if (changes === 0) throw new HttpError(404, 'class not found')
  })
  run()

  const shiftLabel = existing.shift === 'MRNG' ? 'morning' : 'afternoon'
  recordActivity(db, {
    action: ACTIVITY_ACTION.CLASS_DELETED,
    summary: `Deleted class ${existing.name} (${shiftLabel})`,
    metadata: { classId: existing.id },
  })
}
