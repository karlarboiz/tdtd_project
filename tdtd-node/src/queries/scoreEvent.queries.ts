export const SCORE_EVENT_QUERIES = {
  getById: `
    SELECT
      id,
      class_id,
      subject_id,
      kind,
      title,
      date,
      max_score,
      created_at,
      updated_at
    FROM score_events
    WHERE id = ?
    LIMIT 1
  `,
  listByClass: `
    SELECT
      id,
      class_id,
      subject_id,
      kind,
      title,
      date,
      max_score,
      created_at,
      updated_at
    FROM score_events
    WHERE class_id = @class_id
      AND (
        @subject_id IS NULL
        OR subject_id = @subject_id
      )
    ORDER BY COALESCE(date, '') DESC, created_at DESC
  `,
  insert: `
    INSERT INTO score_events (
      id, class_id, subject_id, kind, title, date, max_score, created_at, updated_at
    )
    VALUES (
      @id, @class_id, @subject_id, @kind, @title, @date, @max_score, @created_at, @updated_at
    )
  `,
  update: `
    UPDATE score_events
    SET
      subject_id = @subject_id,
      kind = @kind,
      title = @title,
      date = @date,
      max_score = @max_score,
      updated_at = @updated_at
    WHERE id = @id
  `,
  delete: `
    DELETE FROM score_events
    WHERE id = ?
  `,
} as const
