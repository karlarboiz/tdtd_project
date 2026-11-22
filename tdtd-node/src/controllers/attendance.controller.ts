import type { Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  getAttendanceRoster,
  getAttendanceState,
  listAttendanceSessionDatesInRange,
  saveAttendance,
} from '../services/attendance.service.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'

export function attendancePresentRosterHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : ''
      const period =
        typeof req.query.period === 'string' ? req.query.period : ''
      const roster = getAttendanceRoster(db, req.auth!.id, date, period)
      res.json(roster)
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

export function attendanceStateHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : ''
      const period =
        typeof req.query.period === 'string' ? req.query.period : ''
      const classId =
        typeof req.query.classId === 'string' ? req.query.classId : ''
      const state = getAttendanceState(db, req.auth!.id, date, period, classId)
      res.json(state)
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

export function attendanceSessionDatesHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const from =
        typeof req.query.from === 'string' ? req.query.from : ''
      const to = typeof req.query.to === 'string' ? req.query.to : ''
      const dates = listAttendanceSessionDatesInRange(
        db,
        req.auth!.id,
        from,
        to,
      )
      res.json({ dates })
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

export function attendanceSaveHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const body = req.body as {
        date?: unknown
        period?: unknown
        classStudentIds?: unknown
        marks?: unknown
      }
      const date = typeof body.date === 'string' ? body.date : ''
      const period = typeof body.period === 'string' ? body.period : ''
      const classStudentIds = Array.isArray(body.classStudentIds)
        ? body.classStudentIds.map((x) => String(x ?? ''))
        : []
      const marks = Array.isArray(body.marks)
        ? body.marks.map((item) => {
            const rec =
              item && typeof item === 'object'
                ? (item as { studentId?: unknown; status?: unknown })
                : {}
            return {
              studentId: typeof rec.studentId === 'string' ? rec.studentId : '',
              status: typeof rec.status === 'string' ? rec.status : '',
            }
          })
        : []

      const session = saveAttendance(db, req.auth!.id, {
        date,
        period,
        classStudentIds,
        marks,
      })
      res.status(200).json({ session })
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
