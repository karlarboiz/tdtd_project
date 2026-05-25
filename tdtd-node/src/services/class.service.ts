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
