import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import {
  assignSubjectToClass,
  createScoreEvent,
  listClassSubjects,
  listScoreEntries,
  listScoreEvents,
  removeSubjectFromClass,
  replaceScoreEntries,
} from '../services/score.service.js'

function classIdParam(req: Request): string {
  return typeof req.params.classId === 'string' ? req.params.classId : ''
}

export function listClassSubjectsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(listClassSubjects(db, classIdParam(req)))
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

export function assignClassSubjectHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { subjectId?: unknown }
      const subjectId =
        typeof body.subjectId === 'string' ? body.subjectId : ''
      const row = assignSubjectToClass(db, classIdParam(req), subjectId)
      res.status(201).json(row)
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

export function removeClassSubjectHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const subjectId =
        typeof req.params.subjectId === 'string' ? req.params.subjectId : ''
      removeSubjectFromClass(db, classIdParam(req), subjectId)
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

export function listClassScoreEventsHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const q = req.query.subjectId
      const subjectIdFilter =
        typeof q === 'string' && q.trim() ? q.trim() : undefined
      res.json(listScoreEvents(db, classIdParam(req), subjectIdFilter))
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

export function createClassScoreEventHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as Record<string, unknown>
      const created = createScoreEvent(db, classIdParam(req), {
        subjectId:
          typeof body.subjectId === 'string' ? body.subjectId : '',
        kind: typeof body.kind === 'string' ? body.kind : '',
        title: typeof body.title === 'string' ? body.title : '',
        date: body.date,
        maxScore: body.maxScore,
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

function eventIdParam(req: Request): string {
  return typeof req.params.eventId === 'string' ? req.params.eventId : ''
}

export function listScoreEntriesHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      res.json(listScoreEntries(db, eventIdParam(req)))
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

export function putScoreEntriesHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { entries?: unknown }
      const raw = body.entries
      const entries = Array.isArray(raw) ? raw : []
      const normalized = entries.map((x) =>
        x && typeof x === 'object'
          ? (x as { studentId?: unknown; score?: unknown; note?: unknown })
          : {},
      )
      res.json(replaceScoreEntries(db, eventIdParam(req), normalized))
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
