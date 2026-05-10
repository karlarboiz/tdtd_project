import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  attendanceSaveHandler,
  attendanceSessionDatesHandler,
  attendanceStateHandler,
} from '../controllers/attendance.controller.js'

export function attendanceRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/session-dates', attendanceSessionDatesHandler(db))
  router.get('/state', attendanceStateHandler(db))
  router.post('/save', attendanceSaveHandler(db))
  return router
}
