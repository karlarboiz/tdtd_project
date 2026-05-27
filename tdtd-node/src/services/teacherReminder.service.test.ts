import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import {
  dismissReminder,
  listActiveReminders,
  syncAttendanceDueReminder,
} from './teacherReminder.service.js'

let db: SqliteDatabase
let dbPath: string

beforeEach(() => {
  dbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tdtd-reminder-')),
    'test.sqlite',
  )
  db = new Sqlite(dbPath) as SqliteDatabase
  db.pragma('foreign_keys = ON')
  migrate(db)
})

afterEach(() => {
  db.close()
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true })
})

describe('teacherReminder.service', () => {
  it('opens reminder when no attendance session', () => {
    const result = syncAttendanceDueReminder(db, '2026-05-28', 'AM')
    expect(result).toBe('opened')
    const active = listActiveReminders(db, '2026-05-28')
    expect(active).toHaveLength(1)
    expect(active[0].period).toBe('AM')
    expect(active[0].status).toBe('open')
  })

  it('is idempotent when open reminder already exists', () => {
    syncAttendanceDueReminder(db, '2026-05-28', 'AM')
    expect(syncAttendanceDueReminder(db, '2026-05-28', 'AM')).toBe('unchanged')
    expect(listActiveReminders(db, '2026-05-28')).toHaveLength(1)
  })

  it('resolves reminder when session exists', () => {
    syncAttendanceDueReminder(db, '2026-05-28', 'PM')
    attendanceDao.insertSession(db, {
      id: 'sess-1',
      date: '2026-05-28',
      period: 'PM',
      createdAt: Date.now(),
    })
    expect(syncAttendanceDueReminder(db, '2026-05-28', 'PM')).toBe('resolved')
    expect(listActiveReminders(db, '2026-05-28')).toHaveLength(0)
  })

  it('dismisses open reminder', () => {
    syncAttendanceDueReminder(db, '2026-05-28', 'AM')
    const [open] = listActiveReminders(db, '2026-05-28')
    const dismissed = dismissReminder(db, open.id)
    expect(dismissed.status).toBe('dismissed')
    expect(listActiveReminders(db, '2026-05-28')).toHaveLength(0)
  })
})
