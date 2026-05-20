import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  activateSchoolYearHandler,
  createSchoolYearHandler,
  getActiveSchoolYearHandler,
  listSchoolYearSubjectsHandler,
  listSchoolYearsHandler,
  registerSchoolYearSubjectHandler,
  unregisterSchoolYearSubjectHandler,
} from '../controllers/schoolYear.controller.js'

export function schoolYearRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listSchoolYearsHandler(db))
  router.post('/', createSchoolYearHandler(db))
  router.get('/active', getActiveSchoolYearHandler(db))
  router.patch('/:schoolYearId/active', activateSchoolYearHandler(db))
  router.get('/:schoolYearId/subjects', listSchoolYearSubjectsHandler(db))
  router.post('/:schoolYearId/subjects', registerSchoolYearSubjectHandler(db))
  router.delete(
    '/:schoolYearId/subjects/:registrationId',
    unregisterSchoolYearSubjectHandler(db),
  )
  return router
}
