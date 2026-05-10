import cors from 'cors'
import express from 'express'
import type { SqliteDatabase } from './db/sqlite-types.js'
import { attendanceRouter } from './routes/attendance.routes.js'
import { classRouter } from './routes/class.routes.js'
import { studentRouter } from './routes/student.routes.js'

export function createApp(db: SqliteDatabase): express.Express {
  const app = express()
  app.use(cors({ origin: true }))
  app.use(express.json())
  app.use('/api/classes', classRouter(db))
  app.use('/api/students', studentRouter(db))
  app.use('/api/attendance', attendanceRouter(db))
  return app
}
