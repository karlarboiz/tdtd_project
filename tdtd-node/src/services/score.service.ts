import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  IsoDateString,
  ScoreEntryRow,
  ScoreEventKind,
  ScoreEventRow,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as studentDao from '../dao/student.dao.js'
import * as subjectDao from '../dao/subject.dao.js'
import * as classSubjectDao from '../dao/classSubject.dao.js'
import type { ClassSubjectListRow } from '../dao/classSubject.dao.js'
import * as scoreEventDao from '../dao/scoreEvent.dao.js'
import * as scoreEntryDao from '../dao/scoreEntry.dao.js'
import { assertClassExists } from './subject.service.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type ClassSubjectListItem = ClassSubjectListRow

export function listClassSubjects(
  db: SqliteDatabase,
  classId: string,
): ClassSubjectListItem[] {
  const id = classId.trim()
  if (!id) throw new HttpError(400, 'classId is required')
  assertClassExists(db, id)
  return classSubjectDao.listClassSubjects(db, id)
}

export function assignSubjectToClass(
  db: SqliteDatabase,
  classId: string,
  subjectId: string,
): ClassSubjectListItem {
  const cid = classId.trim()
  const sid = subjectId.trim()
  if (!cid) throw new HttpError(400, 'classId is required')
  if (!sid) throw new HttpError(400, 'subjectId is required')
  assertClassExists(db, cid)
  if (!subjectDao.subjectExists(db, sid)) {
    throw new HttpError(404, 'subject not found')
  }
  if (classSubjectDao.classSubjectPairExists(db, cid, sid)) {
    throw new HttpError(409, 'subject already assigned to this class')
  }
  const row = {
    id: randomUUID(),
    classId: cid,
    subjectId: sid,
    createdAt: Date.now(),
  }
  classSubjectDao.insertClassSubject(db, row)
  const list = classSubjectDao.listClassSubjects(db, cid)
  const found = list.find((x) => x.subjectId === sid)
  if (!found) throw new HttpError(500, 'failed to load class subject')
  return found
}

export function removeSubjectFromClass(
  db: SqliteDatabase,
  classId: string,
  subjectId: string,
): void {
  const cid = classId.trim()
  const sid = subjectId.trim()
  if (!cid) throw new HttpError(400, 'classId is required')
  if (!sid) throw new HttpError(400, 'subjectId is required')
  assertClassExists(db, cid)
  const { changes } = classSubjectDao.deleteClassSubject(db, cid, sid)
  if (changes === 0) {
    throw new HttpError(404, 'class subject assignment not found')
  }
}

function parseScoreKind(raw: string): ScoreEventKind {
  const s = raw.trim()
  if (s === 'QUIZ' || s === 'EXAM' || s === 'PARTICIPATION') return s
  throw new HttpError(400, 'kind must be QUIZ, EXAM, or PARTICIPATION')
}

function parseOptionalDate(raw: unknown): IsoDateString | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'string') {
    throw new HttpError(400, 'date must be a string YYYY-MM-DD')
  }
  const s = raw.trim()
  if (!s) return undefined
  if (!ISO_DATE.test(s)) throw new HttpError(400, 'date must be YYYY-MM-DD')
  return s as IsoDateString
}

export function listScoreEvents(
  db: SqliteDatabase,
  classId: string,
  subjectIdFilter?: string,
): ScoreEventRow[] {
  const cid = classId.trim()
  if (!cid) throw new HttpError(400, 'classId is required')
  assertClassExists(db, cid)
  const sid = subjectIdFilter?.trim()
  const subjectParam = sid ? sid : null
  if (subjectParam && !subjectDao.subjectExists(db, subjectParam)) {
    throw new HttpError(404, 'subject not found')
  }
  return scoreEventDao.listScoreEventsByClass(db, cid, subjectParam)
}

export type CreateScoreEventInput = {
  subjectId: string
  kind: string
  title: string
  date?: unknown
  maxScore?: unknown
}

export function createScoreEvent(
  db: SqliteDatabase,
  classId: string,
  input: CreateScoreEventInput,
): ScoreEventRow {
  const cid = classId.trim()
  if (!cid) throw new HttpError(400, 'classId is required')
  assertClassExists(db, cid)

  const subjectId = typeof input.subjectId === 'string' ? input.subjectId.trim() : ''
  if (!subjectId) throw new HttpError(400, 'subjectId is required')
  if (!subjectDao.subjectExists(db, subjectId)) {
    throw new HttpError(404, 'subject not found')
  }
  if (!classSubjectDao.classSubjectPairExists(db, cid, subjectId)) {
    throw new HttpError(400, 'subject must be assigned to this class before creating a score event')
  }

  const kind = parseScoreKind(typeof input.kind === 'string' ? input.kind : '')
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) throw new HttpError(400, 'title is required')
  const date = parseOptionalDate(input.date)

  let maxScore: number | undefined
  if (input.maxScore !== undefined && input.maxScore !== null) {
    if (typeof input.maxScore !== 'number' || Number.isNaN(input.maxScore)) {
      throw new HttpError(400, 'maxScore must be a number')
    }
    if (input.maxScore < 0) throw new HttpError(400, 'maxScore must be non-negative')
    maxScore = input.maxScore
  }

  const now = Date.now()
  const row: ScoreEventRow = {
    id: randomUUID(),
    classId: cid,
    subjectId,
    kind,
    title,
    date,
    maxScore,
    createdAt: now,
  }
  scoreEventDao.insertScoreEvent(db, row)
  return row
}

export function getScoreEventOrThrow(db: SqliteDatabase, eventId: string): ScoreEventRow {
  const id = eventId.trim()
  if (!id) throw new HttpError(400, 'eventId is required')
  const ev = scoreEventDao.getScoreEventById(db, id)
  if (!ev) throw new HttpError(404, 'score event not found')
  return ev
}

export function listScoreEntries(db: SqliteDatabase, eventId: string): ScoreEntryRow[] {
  const ev = getScoreEventOrThrow(db, eventId)
  void ev
  return scoreEntryDao.listScoreEntriesByEvent(db, eventId.trim())
}

export type ScoreEntryInput = {
  studentId?: unknown
  score?: unknown
  note?: unknown
}

export function replaceScoreEntries(
  db: SqliteDatabase,
  eventId: string,
  entries: ScoreEntryInput[],
): ScoreEntryRow[] {
  const ev = getScoreEventOrThrow(db, eventId)
  const eid = eventId.trim()
  const now = Date.now()

  const run = db.transaction(() => {
    for (const raw of entries) {
      const studentId =
        typeof raw.studentId === 'string' ? raw.studentId.trim() : ''
      if (!studentId) throw new HttpError(400, 'each entry requires studentId')

      const studentClass = studentDao.getClassIdForStudent(db, studentId)
      if (studentClass === undefined) {
        throw new HttpError(404, `student not found: ${studentId}`)
      }
      if (studentClass !== ev.classId) {
        throw new HttpError(400, 'student is not in the same class as this score event')
      }

      let score: number | null = null
      if (raw.score !== undefined && raw.score !== null) {
        if (typeof raw.score !== 'number' || Number.isNaN(raw.score)) {
          throw new HttpError(400, 'score must be a number or null')
        }
        score = raw.score
        if (score < 0) throw new HttpError(400, 'score must be non-negative')
        if (ev.maxScore !== undefined && score > ev.maxScore) {
          throw new HttpError(400, `score must be between 0 and maxScore (${ev.maxScore})`)
        }
      }

      const note =
        typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined

      const row: ScoreEntryRow = {
        id: randomUUID(),
        eventId: eid,
        studentId,
        score,
        note,
        recordedAt: now,
      }
      scoreEntryDao.upsertScoreEntry(db, row)
    }
  })

  run()
  return scoreEntryDao.listScoreEntriesByEvent(db, eid)
}
