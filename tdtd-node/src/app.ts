import cors from 'cors'
import express from 'express'
import type { SqliteDatabase } from './db/sqlite-types.js'
import { attendanceRouter } from './routes/attendance.routes.js'
import { classRouter } from './routes/class.routes.js'
import { scoreEventRouter } from './routes/scoreEvent.routes.js'
import { studentRouter } from './routes/student.routes.js'
import { schoolYearRouter } from './routes/schoolYear.routes.js'
import { subjectRouter } from './routes/subject.routes.js'

export function createApp(db: SqliteDatabase): express.Express {
  const app = express()
  app.use(cors({ origin: true }))
  app.use(express.json())
  app.use('/api/classes', classRouter(db))
  app.use('/api/students', studentRouter(db))
  app.use('/api/attendance', attendanceRouter(db))
  app.use('/api/school-years', schoolYearRouter(db))
  app.use('/api/subjects', subjectRouter(db))
  app.use('/api/score-events', scoreEventRouter(db))
  return app
}
