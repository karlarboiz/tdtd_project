export const SCORE_ENTRY_QUERIES = {
  listByEvent: `
    SELECT id, event_id, student_id, score, note, recorded_at
    FROM score_entries
    WHERE event_id = ?
    ORDER BY student_id ASC
  `,
  upsert: `
    INSERT INTO score_entries (
      id, event_id, student_id, score, note, recorded_at
    )
    VALUES (
      @id, @event_id, @student_id, @score, @note, @recorded_at
    )
    ON CONFLICT(event_id, student_id) DO UPDATE SET
      score = excluded.score,
      note = excluded.note,
      recorded_at = excluded.recorded_at
  `,
} as const
