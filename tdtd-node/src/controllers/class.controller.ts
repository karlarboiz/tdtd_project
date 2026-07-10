import type { Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { createClass, listClasses } from '../services/class.service.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'

export function listClassesHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      res.json(listClasses(db, req.auth!.id))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function createClassHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      const body = req.body as { name?: unknown; shift?: unknown }
      const name = typeof body.name === 'string' ? body.name : ''
      const shift = typeof body.shift === 'string' ? body.shift : ''
      console.log('[tdtd register] POST /api/classes', { name, shift })
      const created = createClass(db, req.auth!.id, { name, shift })
      console.log('[tdtd register] class persisted', {
        id: created.id,
        name: created.name,
      })
      res.status(201).json(created)
    } catch (e) {
      if (e instanceof HttpError) {
        console.warn('[tdtd register] POST /api/classes rejected', e.message)
        res.status(e.statusCode).json({ error: e.message })
        return
      }
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}
