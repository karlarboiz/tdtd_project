import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { createClassHandler, listClassesHandler } from '../controllers/class.controller.js'

export function classRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listClassesHandler(db))
  router.post('/', createClassHandler(db))
  return router
}
