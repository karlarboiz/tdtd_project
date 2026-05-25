import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { listRecentsHandler } from '../controllers/recents.controller.js'

export function recentsRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listRecentsHandler(db))
  return router
}
