import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import { listRecents } from '../services/activityLog.service.js'

export function listRecentsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(listRecents(db, req.query.limit))
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
