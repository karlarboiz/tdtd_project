import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  IsoDateString,
  ScoreEventKind,
  StudentLabAttendanceSessionRow,
  StudentLabAttendanceSummary,
  StudentLabPayload,
  StudentLabProfile,
  StudentLabScoreRow,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import { assertStudentOwned } from '../lib/ownership.js'
import * as classDao from '../dao/class.dao.js'
import * as studentLabDao from '../dao/studentLab.dao.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 366

function parseYmdOrThrow(raw: string | undefined, label: string): string | undefined {
  if (raw === undefined || raw === '') return undefined
  const d = raw.trim()
  if (!DATE_RE.test(d)) {
    throw new HttpError(400, `${label} must be YYYY-MM-DD`)
  }
  return d
}

function ymdDaysBetweenInclusive(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00')
  const b = new Date(to + 'T12:00:00')
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}

function todayYmd(): IsoDateString {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysYmd(ymd: IsoDateString, deltaDays: number): IsoDateString {
  const dt = new Date(ymd + 'T12:00:00')
  dt.setDate(dt.getDate() + deltaDays)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultLast30Range(): { from: IsoDateString; to: IsoDateString } {
  const to = todayYmd()
  const from = addDaysYmd(to, -29)
  return { from, to }
}

export type DateRangeInput = {
  from?: string
  to?: string
}

function parseDateRange(
  input: DateRangeInput,
  opts: { allowAllTime: boolean; defaultRange?: { from: IsoDateString; to: IsoDateString } },
): { from: IsoDateString; to: IsoDateString } | null {
  const fromRaw = parseYmdOrThrow(input.from, 'from')
  const toRaw = parseYmdOrThrow(input.to, 'to')

  if (fromRaw === undefined && toRaw === undefined) {
    if (opts.allowAllTime) return null
    if (opts.defaultRange) return opts.defaultRange
    throw new HttpError(400, 'from and to are required')
  }

  if (fromRaw === undefined || toRaw === undefined) {
    throw new HttpError(400, 'from and to must both be set or both omitted')
  }

  if (fromRaw > toRaw) {
    throw new HttpError(400, 'from must be on or before to')
  }

  const span = ymdDaysBetweenInclusive(fromRaw, toRaw)
  if (span > MAX_RANGE_DAYS) {
    throw new HttpError(400, `date range cannot exceed ${MAX_RANGE_DAYS} days`)
  }

  return { from: fromRaw, to: toRaw }
}

export function getStudentProfile(
  db: SqliteDatabase,
  userId: string,
  studentId: string,
): StudentLabProfile {
  const id = studentId.trim()
  if (!id) throw new HttpError(400, 'studentId is required')

  const student = assertStudentOwned(db, id, userId)
  const classRow = classDao.getClassById(db, student.classId, userId)
  if (!classRow) throw new HttpError(404, 'class not found')

  return { student, class: classRow }
}

function buildAttendanceSummary(
  sessions: StudentLabAttendanceSessionRow[],
): StudentLabAttendanceSummary {
  const totalSessions = sessions.length
  const presentCount = sessions.filter((s) => s.status === 'present').length
  const absentCount = totalSessions - presentCount
  const presentRate =
    totalSessions === 0 ? 0 : Math.round((100 * presentCount) / totalSessions)
  return { totalSessions, presentCount, absentCount, presentRate }
}

function mapScoreRows(
  rows: studentLabDao.StudentLabScoreDbRow[],
): StudentLabScoreRow[] {
  return rows.map((r) => ({
    eventId: r.event_id,
    kind: r.kind,
    title: r.title,
    subjectName: r.subject_name,
    date: r.event_date ?? undefined,
    score: r.score,
    maxScore: r.max_score ?? undefined,
    recordedAt: r.recorded_at,
  }))
}

function loadScoresByKind(
  db: SqliteDatabase,
  studentId: string,
  classId: string,
  kind: ScoreEventKind,
  range: { from: IsoDateString; to: IsoDateString } | null,
): StudentLabScoreRow[] {
  const rows = studentLabDao.listScoresForStudent(
    db,
    studentId,
    classId,
    kind,
    range,
  )
  return mapScoreRows(rows)
}

export type StudentLabQueryInput = {
  from?: string
  to?: string
  scoresFrom?: string
  scoresTo?: string
}

export function getStudentLab(
  db: SqliteDatabase,
  userId: string,
  studentId: string,
  query: StudentLabQueryInput,
): StudentLabPayload {
  const profile = getStudentProfile(db, userId, studentId)
  const { student, class: classRow } = profile

  const fromEmpty = !query.from || query.from.trim() === ''
  const toEmpty = !query.to || query.to.trim() === ''

  let attendanceDateFilter: { from: IsoDateString; to: IsoDateString } | null
  if (fromEmpty && toEmpty) {
    attendanceDateFilter = null
  } else {
    attendanceDateFilter = parseDateRange(
      { from: query.from, to: query.to },
      { allowAllTime: false },
    )
  }

  const scoresFromIn = query.scoresFrom?.trim() || query.from?.trim()
  const scoresToIn = query.scoresTo?.trim() || query.to?.trim()

  const scoresRange = parseDateRange(
    { from: scoresFromIn, to: scoresToIn },
    {
      allowAllTime: false,
      defaultRange: attendanceDateFilter ?? defaultLast30Range(),
    },
  )

  const sessionRows = studentLabDao.listAttendanceSessionsForStudent(
    db,
    student.id,
    classRow.shift,
    attendanceDateFilter,
  )

  const sessions: StudentLabAttendanceSessionRow[] = sessionRows.map((r) => ({
    date: r.date,
    period: r.period,
    status: r.status,
  }))

  return {
    profile,
    attendance: {
      summary: buildAttendanceSummary(sessions),
      sessions,
    },
    scores: {
      recentQuizzes: loadScoresByKind(
        db,
        student.id,
        classRow.id,
        'QUIZ',
        scoresRange,
      ),
      recentExams: loadScoresByKind(
        db,
        student.id,
        classRow.id,
        'EXAM',
        scoresRange,
      ),
      recentParticipation: loadScoresByKind(
        db,
        student.id,
        classRow.id,
        'PARTICIPATION',
        scoresRange,
      ),
    },
  }
}
