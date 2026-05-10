import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { StudentPayloadInput } from '../services/student.service.js'
import {
  listStudentsByClass,
  registerStudent,
  registerStudentsBulk,
} from '../services/student.service.js'
import { HttpError } from '../errors/http-error.js'

function parseStudentPayload(body: Record<string, unknown>): StudentPayloadInput {
  return {
    firstName: typeof body.firstName === 'string' ? body.firstName : '',
    middleName:
      typeof body.middleName === 'string' ? body.middleName : undefined,
    lastName: typeof body.lastName === 'string' ? body.lastName : '',
    birthDate: typeof body.birthDate === 'string' ? body.birthDate : '',
    gender: typeof body.gender === 'string' ? body.gender : '',
  }
}

export function registerStudentHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as Record<string, unknown>
      const classId = typeof body.classId === 'string' ? body.classId : ''
      const payload = parseStudentPayload(body)
      console.log('[tdtd register] POST /api/students', {
        classId,
        firstName: payload.firstName,
        lastName: payload.lastName,
      })
      const student = registerStudent(db, {
        ...payload,
        classId,
      })
      console.log('[tdtd register] student persisted', {
        id: student.id,
        classId: student.classId,
      })
      res.status(201).json(student)
    } catch (e) {
      if (e instanceof HttpError) {
        console.warn('[tdtd register] POST /api/students rejected', e.message)
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function listStudentsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const classId =
        typeof req.query.classId === 'string' ? req.query.classId : ''
      const list = listStudentsByClass(db, classId)
      res.json(list)
    } catch (e) {
      if (e instanceof HttpError) {
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function bulkRegisterHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { classId?: unknown; students?: unknown }
      const classId = typeof body.classId === 'string' ? body.classId : ''
      const raw = body.students
      const students: StudentPayloadInput[] = Array.isArray(raw)
        ? raw.map((x) =>
            parseStudentPayload(
              x && typeof x === 'object'
                ? (x as Record<string, unknown>)
                : {},
            ),
          )
        : []
      console.log('[tdtd register] POST /api/students/bulk', {
        classId,
        count: students.length,
      })
      const created = registerStudentsBulk(db, { classId, students })
      console.log('[tdtd register] bulk persisted', {
        classId,
        created: created.length,
      })
      res.status(201).json(created)
    } catch (e) {
      if (e instanceof HttpError) {
        console.warn('[tdtd register] POST /api/students/bulk rejected', e.message)
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}
