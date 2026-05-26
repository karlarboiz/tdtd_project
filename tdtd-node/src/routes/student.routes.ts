import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  bulkRegisterHandler,
  listStudentsHandler,
  registerStudentHandler,
} from '../controllers/student.controller.js'
import {
  getStudentLabHandler,
  getStudentProfileHandler,
} from '../controllers/studentLab.controller.js'

export function studentRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listStudentsHandler(db))
  router.post('/bulk', bulkRegisterHandler(db))
  router.post('/', registerStudentHandler(db))
  router.get('/:studentId/lab', getStudentLabHandler(db))
  router.get('/:studentId', getStudentProfileHandler(db))
  return router
}
