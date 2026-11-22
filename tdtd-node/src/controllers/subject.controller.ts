import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../services/subject.service.js'
import { HttpError } from '../errors/http-error.js'

export function listSubjectsHandler(db: SqliteDatabase) {
  return (_req: Request, res: Response): void => {
    try {
      res.json(listSubjects(db))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function createSubjectHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { name?: unknown; shortCode?: unknown }
      const created = createSubject(db, {
        name: typeof body.name === 'string' ? body.name : '',
        shortCode:
          typeof body.shortCode === 'string' ? body.shortCode : undefined,
      })
      res.status(201).json(created)
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

function subjectIdParam(req: Request): string {
  return typeof req.params.subjectId === 'string' ? req.params.subjectId : ''
}

export function updateSubjectHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { name?: unknown; shortCode?: unknown }
      const updated = updateSubject(db, subjectIdParam(req), {
        name: typeof body.name === 'string' ? body.name : '',
        shortCode:
          typeof body.shortCode === 'string' ? body.shortCode : undefined,
      })
      res.json(updated)
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

export function deleteSubjectHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      deleteSubject(db, subjectIdParam(req))
      res.status(204).end()
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
