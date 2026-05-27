import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  dismissReminderHandler,
  listActiveRemindersHandler,
} from '../controllers/reminders.controller.js'

export function remindersRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/active', listActiveRemindersHandler(db))
  router.post('/:id/dismiss', dismissReminderHandler(db))
  return router
}
