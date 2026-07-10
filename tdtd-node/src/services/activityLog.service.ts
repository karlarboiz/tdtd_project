import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  ActivityLogMetadata,
  ActivityLogRow,
  ScoreEventKind,
  StudentRow,
} from '../schema/types.js'
import { ACTIVITY_ACTION, type ActivityAction } from '../constants/ActivityActions.js'
import { SCORE_EVENT_KIND } from '../constants/TDTDConstants.js'
import * as activityLogDao from '../dao/activityLog.dao.js'

const DEFAULT_LIST_LIMIT = 100
const MAX_LIST_LIMIT = 500

const SCORE_KIND_LABEL: Record<ScoreEventKind, string> = {
  [SCORE_EVENT_KIND.QUIZ]: 'Quiz',
  [SCORE_EVENT_KIND.EXAM]: 'Exam',
  [SCORE_EVENT_KIND.PARTICIPATION]: 'Participation',
}

export type RecordActivityInput = {
  action: ActivityAction
  summary: string
  metadata?: ActivityLogMetadata
}

export function recordActivity(
  db: SqliteDatabase,
  userId: string,
  input: RecordActivityInput,
): void {
  try {
    const row: ActivityLogRow = {
      id: randomUUID(),
      userId,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata,
      createdAt: Date.now(),
    }
    activityLogDao.insertActivityLog(db, row)
  } catch (e) {
    console.error('[tdtd] activity log failed:', input.action, e)
  }
}

export function listRecents(
  db: SqliteDatabase,
  userId: string,
  limitRaw?: unknown,
): ActivityLogRow[] {
  let limit = DEFAULT_LIST_LIMIT
  if (typeof limitRaw === 'string' && limitRaw.trim()) {
    const n = Number(limitRaw)
    if (!Number.isNaN(n) && n > 0) {
      limit = Math.min(Math.floor(n), MAX_LIST_LIMIT)
    }
  } else if (typeof limitRaw === 'number' && limitRaw > 0) {
    limit = Math.min(Math.floor(limitRaw), MAX_LIST_LIMIT)
  }
  return activityLogDao.listRecentActivityLogs(db, userId, limit)
}

export function formatStudentDisplayName(student: Pick<
  StudentRow,
  'firstName' | 'middleName' | 'lastName'
>): string {
  const parts = [student.firstName]
  if (student.middleName?.trim()) parts.push(student.middleName.trim())
  parts.push(student.lastName)
  return parts.join(' ')
}

export function scoreKindLabel(kind: ScoreEventKind): string {
  return SCORE_KIND_LABEL[kind] ?? kind
}

export { ACTIVITY_ACTION }
