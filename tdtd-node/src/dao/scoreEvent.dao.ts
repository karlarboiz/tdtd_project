import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  AssessmentBucket,
  IsoDateString,
  ScoreEventKind,
  ScoreEventRow,
} from '../schema/types.js'
import { SCORE_EVENT_QUERIES } from '../queries/scoreEvent.queries.js'

type ScoreEventDbRow = {
  id: string
  class_id: string
  subject_id: string
  kind: ScoreEventKind
  quarter: number | null
  assessment_bucket: AssessmentBucket | null
  subtype: string | null
  title: string
  date: string | null
  max_score: number | null
  created_at: number
  updated_at: number | null
}

export function mapScoreEventRow(row: ScoreEventDbRow): ScoreEventRow {
  return {
    id: row.id,
    classId: row.class_id,
    subjectId: row.subject_id,
    kind: row.kind,
    quarter: row.quarter ?? undefined,
    assessmentBucket: row.assessment_bucket ?? undefined,
    subtype: row.subtype ?? undefined,
    title: row.title,
    date: (row.date ?? undefined) as IsoDateString | undefined,
    maxScore: row.max_score ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function getScoreEventById(
  db: SqliteDatabase,
  id: string,
): ScoreEventRow | undefined {
  const row = db.prepare(SCORE_EVENT_QUERIES.getById).get(id) as
    | ScoreEventDbRow
    | undefined
  return row ? mapScoreEventRow(row) : undefined
}

export function listScoreEventsByClass(
  db: SqliteDatabase,
  classId: string,
  subjectId: string | null,
): ScoreEventRow[] {
  const rows = db.prepare(SCORE_EVENT_QUERIES.listByClass).all({
    class_id: classId,
    subject_id: subjectId,
  }) as ScoreEventDbRow[]
  return rows.map(mapScoreEventRow)
}

export function insertScoreEvent(db: SqliteDatabase, row: ScoreEventRow): void {
  db.prepare(SCORE_EVENT_QUERIES.insert).run({
    id: row.id,
    class_id: row.classId,
    subject_id: row.subjectId,
    kind: row.kind,
    quarter: row.quarter ?? null,
    assessment_bucket: row.assessmentBucket ?? null,
    subtype: row.subtype ?? null,
    title: row.title,
    date: row.date ?? null,
    max_score: row.maxScore ?? null,
    created_at: row.createdAt,
    updated_at: row.updatedAt ?? null,
  })
}
