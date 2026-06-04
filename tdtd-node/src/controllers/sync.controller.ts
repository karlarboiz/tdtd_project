import type { Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { pullSync, pushSync, type SyncPushChangeDto } from '../services/sync.service.js'

export function pullSyncHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const userId = req.auth?.id
      if (!userId) throw new HttpError(401, 'Unauthorized')
      const since =
        typeof req.query.since === 'string' ? req.query.since : undefined
      res.json(pullSync(db, userId, since))
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

export function pushSyncHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const userId = req.auth?.id
      if (!userId) throw new HttpError(401, 'Unauthorized')
      const body = req.body as { changes?: SyncPushChangeDto[] }
      const changes = Array.isArray(body?.changes) ? body.changes : []
      res.json(pushSync(db, userId, changes))
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
