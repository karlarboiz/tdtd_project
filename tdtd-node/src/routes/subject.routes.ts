import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  createSubjectHandler,
  listSubjectsHandler,
} from '../controllers/subject.controller.js'

export function subjectRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listSubjectsHandler(db))
  router.post('/', createSubjectHandler(db))
  return router
}
