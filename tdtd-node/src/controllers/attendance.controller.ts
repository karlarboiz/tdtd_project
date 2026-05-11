import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  getAttendanceState,
  getPresentAttendanceRoster,
  listAttendanceSessionDatesInRange,
  saveAttendance,
} from '../services/attendance.service.js'
import { HttpError } from '../errors/http-error.js'

export function attendancePresentRosterHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : ''
      const period =
        typeof req.query.period === 'string' ? req.query.period : ''
      const roster = getPresentAttendanceRoster(db, date, period)
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
  return (req: Request, res: Response): void => {
    try {
      const date =
        typeof req.query.date === 'string' ? req.query.date : ''
      const period =
        typeof req.query.period === 'string' ? req.query.period : ''
      const classId =
        typeof req.query.classId === 'string' ? req.query.classId : ''
      const state = getAttendanceState(db, date, period, classId)
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
  return (req: Request, res: Response): void => {
    try {
      const from =
        typeof req.query.from === 'string' ? req.query.from : ''
      const to = typeof req.query.to === 'string' ? req.query.to : ''
      const dates = listAttendanceSessionDatesInRange(db, from, to)
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
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as {
        date?: unknown
        period?: unknown
        classStudentIds?: unknown
        presentStudentIds?: unknown
      }
      const date = typeof body.date === 'string' ? body.date : ''
      const period = typeof body.period === 'string' ? body.period : ''
      const classStudentIds = Array.isArray(body.classStudentIds)
        ? body.classStudentIds.map((x) => String(x ?? ''))
        : []
      const presentStudentIds = Array.isArray(body.presentStudentIds)
        ? body.presentStudentIds.map((x) => String(x ?? ''))
        : []

      const session = saveAttendance(db, {
        date,
        period,
        classStudentIds,
        presentStudentIds,
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
