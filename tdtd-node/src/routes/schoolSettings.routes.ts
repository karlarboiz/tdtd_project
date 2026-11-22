import { Router, type Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import * as service from '../services/schoolSettings.service.js'

export function schoolSettingsRouter(db: SqliteDatabase): Router {
  const router = Router()

  router.get('/', (req: AuthenticatedRequest, res: Response) => {
    const row = service.getSchoolSettings(db, req.auth!.id)
    res.json(row ?? null)
  })

  router.put('/', (req: AuthenticatedRequest, res: Response) => {
    const row = service.saveSchoolSettings(db, req.auth!.id, req.body)
    res.json(row)
  })

  return router
}
