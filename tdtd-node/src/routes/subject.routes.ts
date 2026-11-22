import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  createSubjectHandler,
  deleteSubjectHandler,
  listSubjectsHandler,
  updateSubjectHandler,
} from '../controllers/subject.controller.js'

export function subjectRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listSubjectsHandler(db))
  router.post('/', createSubjectHandler(db))
  router.patch('/:subjectId', updateSubjectHandler(db))
  router.delete('/:subjectId', deleteSubjectHandler(db))
  return router
}
