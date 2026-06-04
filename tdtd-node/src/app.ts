import cors from 'cors'
import express from 'express'
import type { SqliteDatabase } from './db/sqlite-types.js'
import { attendanceRouter } from './routes/attendance.routes.js'
import { authRouter } from './routes/auth.routes.js'
import { classRouter } from './routes/class.routes.js'
import { scoreEventRouter } from './routes/scoreEvent.routes.js'
import { studentRouter } from './routes/student.routes.js'
import { schoolYearRouter } from './routes/schoolYear.routes.js'
import { subjectRouter } from './routes/subject.routes.js'
import { recentsRouter } from './routes/recents.routes.js'
import { remindersRouter } from './routes/reminders.routes.js'
import { dueListRouter } from './routes/dueList.routes.js'
import { syncRouter } from './routes/sync.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { authenticate } from './middleware/authenticate.js'

export function createApp(db: SqliteDatabase): express.Express {
  const app = express()
  app.use(cors({ origin: true }))
  app.use(express.json())

  const api = express.Router()
  api.use('/health', healthRouter())
  api.use('/auth', authRouter(db))
  api.use(authenticate(db))
  api.use('/sync', syncRouter(db))
  api.use('/classes', classRouter(db))
  api.use('/students', studentRouter(db))
  api.use('/attendance', attendanceRouter(db))
  api.use('/school-years', schoolYearRouter(db))
  api.use('/subjects', subjectRouter(db))
  api.use('/score-events', scoreEventRouter(db))
  api.use('/recents', recentsRouter(db))
  api.use('/reminders', remindersRouter(db))
  api.use('/due-list', dueListRouter(db))

  app.use('/api', api)
  return app
}
