import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import {
  listDueItems,
  listMissedAttendanceDueItems,
} from '../services/dueList.service.js'

export function listDueItemsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(listDueItems(db, req.query.date))
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

export function listMissedDueItemsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(
        listMissedAttendanceDueItems(db, req.query.from, req.query.to),
      )
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
