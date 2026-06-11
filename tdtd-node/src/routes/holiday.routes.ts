import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  listHolidaysHandler,
  listHolidaysRangeHandler,
  refreshHolidaysHandler,
} from '../controllers/holiday.controller.js'

export function holidayRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.get('/', listHolidaysHandler(db))
  router.get('/range', listHolidaysRangeHandler(db))
  router.post('/refresh', refreshHolidaysHandler(db))
  return router
}
