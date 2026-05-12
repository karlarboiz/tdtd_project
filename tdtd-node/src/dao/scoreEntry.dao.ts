import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { ScoreEntryRow } from '../schema/types.js'
import { SCORE_ENTRY_QUERIES } from '../queries/scoreEntry.queries.js'

type ScoreEntryDbRow = {
  id: string
  event_id: string
  student_id: string
  score: number | null
  note: string | null
  recorded_at: number
}

export function mapScoreEntryRow(row: ScoreEntryDbRow): ScoreEntryRow {
  return {
    id: row.id,
    eventId: row.event_id,
    studentId: row.student_id,
    score: row.score,
    note: row.note ?? undefined,
    recordedAt: row.recorded_at,
  }
}

export function listScoreEntriesByEvent(
  db: SqliteDatabase,
  eventId: string,
): ScoreEntryRow[] {
  const rows = db.prepare(SCORE_ENTRY_QUERIES.listByEvent).all(eventId) as ScoreEntryDbRow[]
  return rows.map(mapScoreEntryRow)
}

export function upsertScoreEntry(
  db: SqliteDatabase,
  row: ScoreEntryRow,
): void {
  db.prepare(SCORE_ENTRY_QUERIES.upsert).run({
    id: row.id,
    event_id: row.eventId,
    student_id: row.studentId,
    score: row.score,
    note: row.note ?? null,
    recorded_at: row.recordedAt,
  })
}
