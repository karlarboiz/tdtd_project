import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import { dismissReminder } from './teacherReminder.service.js'
import {
  listDueItems,
  listMissedAttendanceDueItems,
  shouldShowAttendanceDue,
} from './dueList.service.js'

let db: SqliteDatabase
let dbPath: string

beforeEach(() => {
  dbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tdtd-duelist-')),
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

describe('shouldShowAttendanceDue', () => {
  const fri = new Date('2026-05-29T12:00:00+08:00')
  const sat = new Date('2026-05-30T12:00:00+08:00')

  it('allows today on a weekday', () => {
    expect(
      shouldShowAttendanceDue('2026-05-29', '2026-05-29', 'Asia/Manila', fri),
    ).toBe(true)
  })

  it('blocks non-today dates', () => {
    expect(
      shouldShowAttendanceDue('2026-05-28', '2026-05-29', 'Asia/Manila', fri),
    ).toBe(false)
  })

  it('blocks weekends', () => {
    expect(
      shouldShowAttendanceDue('2026-05-30', '2026-05-30', 'Asia/Manila', sat),
    ).toBe(false)
  })
})

describe('dueList.service', () => {
  const fri = new Date('2026-05-29T12:00:00+08:00')
  const sat = new Date('2026-05-30T12:00:00+08:00')

  it('returns AM and PM due items when no sessions exist on a weekday', () => {
    const items = listDueItems(db, '2026-05-29', fri)
    expect(items).toHaveLength(2)
    const am = items.find((i) => i.period === 'AM')
    expect(am?.kind).toBe('ATTENDANCE_DUE')
    expect(am?.title).toBe('AM attendance')
    expect(am?.actionPath).toBe(
      '/attendance/session/2026-05-29?period=AM',
    )
  })

  it('returns empty on weekend', () => {
    listDueItems(db, '2026-05-30', sat)
    attendanceDao.insertSession(db, {
      id: 'sess-am',
      date: '2026-05-30',
      period: 'AM',
      createdAt: Date.now(),
    })
    expect(listDueItems(db, '2026-05-30', sat)).toEqual([])
  })

  it('returns empty when date is not today', () => {
    expect(listDueItems(db, '2026-05-28', fri)).toEqual([])
  })

  it('clears PM due item when PM session exists', () => {
    listDueItems(db, '2026-05-29', fri)
    attendanceDao.insertSession(db, {
      id: 'sess-pm',
      date: '2026-05-29',
      period: 'PM',
      createdAt: Date.now(),
    })
    const after = listDueItems(db, '2026-05-29', fri)
    expect(after.some((i) => i.period === 'PM')).toBe(false)
    expect(after.some((i) => i.period === 'AM')).toBe(true)
  })

  it('removes dismissed item from due list', () => {
    const items = listDueItems(db, '2026-05-29', fri)
    const am = items.find((i) => i.period === 'AM')
    expect(am).toBeDefined()
    dismissReminder(db, am!.id)
    const after = listDueItems(db, '2026-05-29', fri)
    expect(after.find((i) => i.id === am!.id)).toBeUndefined()
  })
})

describe('listMissedAttendanceDueItems', () => {
  const fri = new Date('2026-05-29T12:00:00+08:00')

  it('lists weekday AM and PM gaps in range', () => {
    const items = listMissedAttendanceDueItems(
      db,
      '2026-05-27',
      '2026-05-29',
      fri,
    )
    const friItems = items.filter((i) => i.date === '2026-05-29')
    expect(friItems).toHaveLength(2)
    expect(friItems.map((i) => i.period).sort()).toEqual(['AM', 'PM'])
    expect(friItems[0]?.id).toMatch(/^missed:/)
  })

  it('omits a period after session is saved', () => {
    listMissedAttendanceDueItems(db, '2026-05-29', '2026-05-29', fri)
    attendanceDao.insertSession(db, {
      id: 'sess-am',
      date: '2026-05-29',
      period: 'AM',
      createdAt: Date.now(),
    })
    const after = listMissedAttendanceDueItems(
      db,
      '2026-05-29',
      '2026-05-29',
      fri,
    )
    expect(after).toHaveLength(1)
    expect(after[0]?.period).toBe('PM')
  })

  it('skips weekends in range', () => {
    const items = listMissedAttendanceDueItems(
      db,
      '2026-05-30',
      '2026-05-31',
      new Date('2026-05-31T12:00:00+08:00'),
    )
    expect(items).toHaveLength(0)
  })
})
