import { Router, type Request, type Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as service from '../services/schoolSettings.service.js'

export function schoolSettingsRouter(db: SqliteDatabase): Router {
  const router = Router()

  router.get('/', (_req: Request, res: Response) => {
    const row = service.getSchoolSettings(db)
    res.json(row ?? null)
  })

  router.put('/', (req: Request, res: Response) => {
    const row = service.saveSchoolSettings(db, req.body)
    res.json(row)
  })

  return router
}
