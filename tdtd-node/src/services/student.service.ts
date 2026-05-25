import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  IsoDateString,
  StudentGenderCode,
  StudentRow,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as studentDao from '../dao/student.dao.js'
import * as classDao from '../dao/class.dao.js'
import {
  ACTIVITY_ACTION,
  formatStudentDisplayName,
  recordActivity,
} from './activityLog.service.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type StudentPayloadInput = {
  firstName: string
  middleName?: string
  lastName: string
  birthDate: string
  gender: string
}

export type RegisterStudentInput = StudentPayloadInput & {
  classId: string
}

export type BulkRegisterInput = {
  classId: string
  students: StudentPayloadInput[]
}

export function assertValidBirthDate(raw: string): IsoDateString {
  const s = raw.trim()
  if (!ISO_DATE.test(s)) {
    throw new HttpError(400, 'birthDate must be YYYY-MM-DD')
  }
  const parts = s.split('-').map((x) => Number(x))
  const y = parts[0]!
  const m = parts[1]!
  const d = parts[2]!
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new HttpError(400, 'birthDate is not a valid calendar date')
  }
  return s
}

export function normalizeGender(raw: string): StudentGenderCode {
  const x = raw.trim().toUpperCase()
  if (x === 'M' || x === 'MALE') return 'M'
  if (x === 'F' || x === 'FEMALE') return 'F'
  if (x === 'O' || x === 'OTHER') return 'O'
  throw new HttpError(
    400,
    'gender must be M / F / O or Male / Female / Other',
  )
}

function normalizeMiddle(middleName: string | undefined): string | undefined {
  if (middleName === undefined) return undefined
  const s = middleName.trim()
  return s === '' ? undefined : s
}

export function toStudentRow(
  classId: string,
  input: StudentPayloadInput,
  id: string,
  createdAt: number,
): StudentRow {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName) throw new HttpError(400, 'firstName is required')
  if (!lastName) throw new HttpError(400, 'lastName is required')
  const birthDate = assertValidBirthDate(input.birthDate)
  const gender = normalizeGender(input.gender)

  return {
    id,
    firstName,
    middleName: normalizeMiddle(input.middleName),
    lastName,
    birthDate,
    gender,
    classId,
    createdAt,
  }
}

export function listStudentsByClass(db: SqliteDatabase, classId: string): StudentRow[] {
  const id = classId.trim()
  if (!id) throw new HttpError(400, 'classId is required')
  if (!studentDao.classExists(db, id)) {
    throw new HttpError(404, 'class not found')
  }
  return studentDao.listStudentsByClass(db, id)
}

export function registerStudent(db: SqliteDatabase, input: RegisterStudentInput): StudentRow {
  const classId = input.classId.trim()
  if (!classId) {
    throw new HttpError(400, 'classId is required')
  }
  if (!studentDao.classExists(db, classId)) {
    throw new HttpError(404, 'class not found')
  }

  const ts = Date.now()
  const row = toStudentRow(
    classId,
    {
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      gender: input.gender,
    },
    randomUUID(),
    ts,
  )
  studentDao.insertStudent(db, row)
  const classRow = classDao.getClassById(db, classId)
  const classLabel = classRow?.name ?? 'class'
  recordActivity(db, {
    action: ACTIVITY_ACTION.STUDENT_REGISTERED,
    summary: `Added student ${formatStudentDisplayName(row)} to ${classLabel}`,
    metadata: { classId, studentId: row.id },
  })
  return row
}

export function registerStudentsBulk(
  db: SqliteDatabase,
  input: BulkRegisterInput,
): StudentRow[] {
  const classId = input.classId.trim()
  if (!classId) throw new HttpError(400, 'classId is required')
  if (!studentDao.classExists(db, classId)) {
    throw new HttpError(404, 'class not found')
  }

  const list = Array.isArray(input.students) ? input.students : []
  if (list.length === 0) {
    throw new HttpError(400, 'at least one student is required')
  }

  const ts = Date.now()
  const created: StudentRow[] = []
  const run = db.transaction((students: StudentPayloadInput[]) => {
    for (const p of students) {
      const row = toStudentRow(classId, p, randomUUID(), ts)
      studentDao.insertStudent(db, row)
      created.push(row)
    }
  })
  run(list)
  const classRow = classDao.getClassById(db, classId)
  const classLabel = classRow?.name ?? 'class'
  recordActivity(db, {
    action: ACTIVITY_ACTION.STUDENTS_IMPORTED,
    summary: `Imported ${created.length} students into ${classLabel}`,
    metadata: { classId, count: created.length },
  })
  return created
}
