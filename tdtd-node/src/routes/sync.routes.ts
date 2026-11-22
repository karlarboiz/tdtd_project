import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { pullSyncHandler, pushSyncHandler } from '../controllers/sync.controller.js'

export function syncRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/pull', pullSyncHandler(db))
  router.post('/push', pushSyncHandler(db))
  return router
}
