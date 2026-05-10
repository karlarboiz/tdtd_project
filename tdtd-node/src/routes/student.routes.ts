import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  bulkRegisterHandler,
  listStudentsHandler,
  registerStudentHandler,
} from '../controllers/student.controller.js'

export function studentRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listStudentsHandler(db))
  router.post('/bulk', bulkRegisterHandler(db))
  router.post('/', registerStudentHandler(db))
  return router
}
