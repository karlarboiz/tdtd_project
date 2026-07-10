import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../errors/http-error.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import * as attendanceDao from '../dao/attendance.dao.js'
import * as studentDao from '../dao/student.dao.js'
import { recordActivity } from './activityLog.service.js'
import {
  getAttendanceState,
  listAttendanceSessionDatesInRange,
  saveAttendance,
} from './attendance.service.js'

vi.mock('../dao/attendance.dao.js', () => ({
  listDistinctSessionDatesInRange: vi.fn(),
  findSessionByDatePeriod: vi.fn(),
  selectPresentStudentIds: vi.fn(),
  insertSession: vi.fn(),
  deleteRecordsForStudentsInSession: vi.fn(),
  insertAttendanceRecord: vi.fn(),
}))

vi.mock('../dao/student.dao.js', () => ({
  classExists: vi.fn(),
  listStudentsByClass: vi.fn(),
}))

vi.mock('../lib/ownership.js', () => ({
  assertClassOwned: vi.fn(),
}))

vi.mock('./activityLog.service.js', () => ({
  ACTIVITY_ACTION: {
    ATTENDANCE_SAVED: 'ATTENDANCE_SAVED',
  },
  recordActivity: vi.fn(),
}))

vi.mock('./teacherReminder.service.js', () => ({
  resolveAttendanceReminder: vi.fn(),
}))

vi.mock('../lib/schoolDay.js', () => ({
  isSchoolDayYmd: vi.fn((_db, ymd: string) => {
    const d = new Date(ymd + 'T12:00:00')
    const dow = d.getDay()
    return dow !== 0 && dow !== 6
  }),
}))

const USER_ID = 'user-test-1'

function makeDb(): SqliteDatabase {
  return {
    transaction: (fn: () => void) => fn,
  } as unknown as SqliteDatabase
}

describe('attendance.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listAttendanceSessionDatesInRange', () => {
    it('rejects date ranges longer than 366 days', () => {
      const db = makeDb()
      expect(() =>
        listAttendanceSessionDatesInRange(db, USER_ID, '2026-01-01', '2027-01-02'),
      ).toThrowError(new HttpError(400, 'date range cannot exceed 366 days'))
    })

    it('returns dates from attendance DAO for valid range', () => {
      const db = makeDb()
      vi.mocked(attendanceDao.listDistinctSessionDatesInRange).mockReturnValue([
        '2026-05-26',
        '2026-05-27',
      ])

      const result = listAttendanceSessionDatesInRange(
        db,
        USER_ID,
        '2026-05-01',
        '2026-05-31',
      )

      expect(result).toEqual(['2026-05-26', '2026-05-27'])
      expect(attendanceDao.listDistinctSessionDatesInRange).toHaveBeenCalledWith(
        db,
        USER_ID,
        '2026-05-01',
        '2026-05-31',
      )
    })
  })

  describe('getAttendanceState', () => {
    it('throws 404 when class does not exist', async () => {
      const db = makeDb()
      const { assertClassOwned } = await import('../lib/ownership.js')
      vi.mocked(assertClassOwned).mockImplementation(() => {
        throw new HttpError(404, 'Class not found')
      })

      expect(() =>
        getAttendanceState(db, USER_ID, '2026-05-27', 'AM', 'class-1'),
      ).toThrowError(new HttpError(404, 'Class not found'))
    })

    it('returns empty present ids when session is missing', async () => {
      const db = makeDb()
      const { assertClassOwned } = await import('../lib/ownership.js')
      vi.mocked(assertClassOwned).mockReturnValue({
        id: 'class-1',
        userId: USER_ID,
        name: 'C',
        shift: 'MRNG',
        createdAt: 1,
      })
      vi.mocked(studentDao.listStudentsByClass).mockReturnValue([
        {
          id: 's-1',
          firstName: 'A',
          lastName: 'B',
          birthDate: '2014-01-01',
          gender: 'M',
          classId: 'class-1',
          createdAt: 1,
        },
      ])
      vi.mocked(attendanceDao.findSessionByDatePeriod).mockReturnValue(undefined)

      const state = getAttendanceState(db, USER_ID, '2026-05-27', 'AM', 'class-1')
      expect(state).toEqual({ session: null, presentStudentIds: [] })
    })
  })

  describe('saveAttendance', () => {
    it('rejects weekend dates', () => {
      const db = makeDb()
      expect(() =>
        saveAttendance(db, USER_ID, {
          date: '2026-06-06',
          period: 'AM',
          classStudentIds: ['s-1'],
          presentStudentIds: ['s-1'],
        }),
      ).toThrowError(
        new HttpError(400, 'attendance is not recorded on non-school days'),
      )
    })

    it('filters present ids by class list and records activity', () => {
      const db = makeDb()
      vi.mocked(attendanceDao.findSessionByDatePeriod).mockReturnValue({
        id: 'sess-1',
        userId: USER_ID,
        date: '2026-05-27',
        period: 'AM',
        createdAt: 1,
      })

      const session = saveAttendance(db, USER_ID, {
        date: '2026-05-27',
        period: 'AM',
        classStudentIds: ['s-1', 's-2'],
        presentStudentIds: ['s-1', 'outsider', 's-1'],
      })

      expect(session.id).toBe('sess-1')
      expect(attendanceDao.deleteRecordsForStudentsInSession).toHaveBeenCalledWith(
        db,
        'sess-1',
        ['s-1', 's-2'],
      )
      expect(attendanceDao.insertAttendanceRecord).toHaveBeenCalledTimes(1)
      expect(recordActivity).toHaveBeenCalledWith(
        db,
        USER_ID,
        expect.objectContaining({
          summary: 'Saved AM attendance for 2026-05-27 (1 present)',
          metadata: expect.objectContaining({ count: 1 }),
        }),
      )
    })
  })
})
