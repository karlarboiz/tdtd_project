/** SQL for Student Lab read aggregations (no new tables). */

export const STUDENT_LAB_QUERIES = {
  attendanceSessionsForStudent: `
    SELECT
      sess.date AS date,
      sess.period AS period,
      CASE WHEN ar.id IS NOT NULL THEN 'present' ELSE 'absent' END AS status
    FROM attendance_sessions sess
    LEFT JOIN attendance_records ar
      ON ar.session_id = sess.id AND ar.student_id = ?
    WHERE
      (
        (? = 'MRNG' AND sess.period = 'AM')
        OR (? = 'AFTNN' AND sess.period = 'PM')
      )
      AND (? = 0 OR (sess.date >= ? AND sess.date <= ?))
    ORDER BY sess.date DESC, sess.period DESC
  `,
  scoresForStudent: `
    SELECT
      se.id AS event_id,
      se.kind AS kind,
      se.title AS title,
      sub.name AS subject_name,
      se.date AS event_date,
      se.max_score AS max_score,
      se.created_at AS event_created_at,
      ent.score AS score,
      ent.recorded_at AS recorded_at
    FROM score_entries ent
    INNER JOIN score_events se ON se.id = ent.event_id
    INNER JOIN subjects sub ON sub.id = se.subject_id
    WHERE ent.student_id = ?
      AND se.class_id = ?
      AND se.kind = ?
      AND ent.score IS NOT NULL
      AND (
        ? = 0
        OR (
          COALESCE(
            se.date,
            date(ent.recorded_at / 1000, 'unixepoch')
          ) >= ?
          AND COALESCE(
            se.date,
            date(ent.recorded_at / 1000, 'unixepoch')
          ) <= ?
        )
      )
    ORDER BY
      COALESCE(
        se.date,
        date(ent.recorded_at / 1000, 'unixepoch')
      ) DESC,
      ent.recorded_at DESC
  `,
} as const
