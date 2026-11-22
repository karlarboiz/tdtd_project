import type { Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import {
  activateSchoolYear,
  createSchoolYear,
  getActiveSchoolYear,
  listRegisteredSubjects,
  listSchoolYears,
  registerSubjectForSchoolYear,
  unregisterSubjectFromSchoolYear,
} from '../services/schoolYear.service.js'

function handleError(e: unknown, res: Response): void {
  if (e instanceof HttpError) {
    res.status(e.statusCode).json({ error: e.message })
    return
  }
  console.error(e)
  res.status(500).json({ error: 'internal server error' })
}

export function listSchoolYearsHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      res.json(listSchoolYears(db, req.auth!.id))
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function createSchoolYearHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const created = createSchoolYear(
        db,
        req.auth!.id,
        req.body as Record<string, unknown>,
      )
      res.status(201).json(created)
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function getActiveSchoolYearHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      res.json(getActiveSchoolYear(db, req.auth!.id))
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function activateSchoolYearHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const id = typeof req.params.schoolYearId === 'string' ? req.params.schoolYearId : ''
      res.json(activateSchoolYear(db, req.auth!.id, id))
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function listSchoolYearSubjectsHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const id = typeof req.params.schoolYearId === 'string' ? req.params.schoolYearId : ''
      res.json(listRegisteredSubjects(db, req.auth!.id, id))
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function registerSchoolYearSubjectHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const id = typeof req.params.schoolYearId === 'string' ? req.params.schoolYearId : ''
      const created = registerSubjectForSchoolYear(
        db,
        req.auth!.id,
        id,
        req.body as Record<string, unknown>,
      )
      res.status(201).json(created)
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function unregisterSchoolYearSubjectHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const yearId =
        typeof req.params.schoolYearId === 'string' ? req.params.schoolYearId : ''
      const registrationId =
        typeof req.params.registrationId === 'string' ? req.params.registrationId : ''
      unregisterSubjectFromSchoolYear(db, req.auth!.id, yearId, registrationId)
      res.status(204).send()
    } catch (e) {
      handleError(e, res)
    }
  }
}
