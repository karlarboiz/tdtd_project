import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  listDueItemsHandler,
  listMissedDueItemsHandler,
} from '../controllers/dueList.controller.js'

export function dueListRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/missed', listMissedDueItemsHandler(db))
  router.get('/', listDueItemsHandler(db))
  return router
}
