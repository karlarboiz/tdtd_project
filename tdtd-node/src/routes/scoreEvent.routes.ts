import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  listScoreEntriesHandler,
  putScoreEntriesHandler,
} from '../controllers/score.controller.js'

export function scoreEventRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/:eventId/entries', listScoreEntriesHandler(db))
  router.put('/:eventId/entries', putScoreEntriesHandler(db))
  return router
}
