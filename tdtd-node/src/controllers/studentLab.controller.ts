import type { Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import {
  getStudentLab,
  getStudentProfile,
} from '../services/studentLab.service.js'

export function getStudentProfileHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const studentId =
        typeof req.params.studentId === 'string' ? req.params.studentId : ''
      const profile = getStudentProfile(db, req.auth!.id, studentId)
      res.json(profile)
    } catch (e) {
      if (e instanceof HttpError) {
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function getStudentLabHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const studentId =
        typeof req.params.studentId === 'string' ? req.params.studentId : ''
      const q = req.query
      const payload = getStudentLab(db, req.auth!.id, studentId, {
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        scoresFrom: typeof q.scoresFrom === 'string' ? q.scoresFrom : undefined,
        scoresTo: typeof q.scoresTo === 'string' ? q.scoresTo : undefined,
      })
      res.json(payload)
    } catch (e) {
      if (e instanceof HttpError) {
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}
