import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { createClassHandler, listClassesHandler } from '../controllers/class.controller.js'
import {
  assignClassSubjectHandler,
  createClassScoreEventHandler,
  listClassScoreEventsHandler,
  listClassSubjectsHandler,
  removeClassSubjectHandler,
} from '../controllers/score.controller.js'

export function classRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listClassesHandler(db))
  router.post('/', createClassHandler(db))
  router.get('/:classId/subjects', listClassSubjectsHandler(db))
  router.post('/:classId/subjects', assignClassSubjectHandler(db))
  router.delete('/:classId/subjects/:subjectId', removeClassSubjectHandler(db))
  router.get('/:classId/score-events', listClassScoreEventsHandler(db))
  router.post('/:classId/score-events', createClassScoreEventHandler(db))
  return router
}
