import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { createClass, listClasses } from '../services/class.service.js'
import { HttpError } from '../errors/http-error.js'

export function listClassesHandler(db: SqliteDatabase) {
  return (_req: Request, res: Response): void => {
    try {
      res.json(listClasses(db))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'internal server error' })
    }
  }
}

export function createClassHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      const body = req.body as { name?: unknown; shift?: unknown }
      const name = typeof body.name === 'string' ? body.name : ''
      const shift = typeof body.shift === 'string' ? body.shift : ''
      console.log('[tdtd register] POST /api/classes', { name, shift })
      const created = createClass(db, { name, shift })
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
