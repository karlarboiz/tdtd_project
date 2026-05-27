import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import {
  dismissReminder,
  listActiveReminders,
} from '../services/teacherReminder.service.js'

export function listActiveRemindersHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(listActiveReminders(db, req.query.date))
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

export function dismissReminderHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : ''
      res.json(dismissReminder(db, id))
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
