import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import {
  getHolidaysForYear,
  getNonWorkingDatesInRange,
  refreshYear,
} from '../services/holiday.service.js'

function handleError(e: unknown, res: Response): void {
  if (e instanceof HttpError) {
    res.status(e.statusCode).json({ error: e.message })
    return
  }
  console.error(e)
  res.status(500).json({ error: 'internal server error' })
}

export function listHolidaysHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const year = req.query.year
      if (year === undefined || year === '') {
        throw new HttpError(400, 'year query parameter is required')
      }
      const result = await getHolidaysForYear(db, year)
      res.json(result)
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function listHolidaysRangeHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const from = String(req.query.from ?? '')
      const to = String(req.query.to ?? '')
      if (!from || !to) {
        throw new HttpError(400, 'from and to query parameters are required')
      }
      const result = await getNonWorkingDatesInRange(db, from, to)
      res.json(result)
    } catch (e) {
      handleError(e, res)
    }
  }
}

export function refreshHolidaysHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const year = req.query.year
      if (year === undefined || year === '') {
        throw new HttpError(400, 'year query parameter is required')
      }
      const yearNum = Number(year)
      if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
        throw new HttpError(400, 'year must be an integer between 2000 and 2100')
      }
      const holidays = await refreshYear(db, yearNum)
      res.json({
        holidays,
        meta: {
          year: yearNum,
          count: holidays.length,
          fetchedAt: holidays[0]?.fetchedAt,
        },
      })
    } catch (e) {
      handleError(e, res)
    }
  }
}
