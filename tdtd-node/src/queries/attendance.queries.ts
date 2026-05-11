export const ATTENDANCE_QUERIES = {
  sessionByDatePeriod: `
    SELECT id, date, period, created_at
    FROM attendance_sessions
    WHERE date = ? AND period = ?
    LIMIT 1
  `,
  sessionInsert: `
    INSERT INTO attendance_sessions (id, date, period, created_at)
    VALUES (@id, @date, @period, @created_at)
  `,
  presentStudentIds: `
    SELECT student_id
    FROM attendance_records
    WHERE session_id = ?
      AND student_id IN (%IDS%)
  `,
  deleteRecordsForStudents: `
    DELETE FROM attendance_records
    WHERE session_id = ?
      AND student_id IN (%IDS%)
  `,
  recordInsert: `
    INSERT INTO attendance_records (id, session_id, student_id, status, timestamp)
    VALUES (@id, @session_id, @student_id, @status, @timestamp)
  `,
  distinctSessionDatesInRange: `
    SELECT DISTINCT date
    FROM attendance_sessions
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `,
  presentStudentsForSession: `
    SELECT
      s.id,
      s.first_name,
      s.middle_name,
      s.last_name,
      s.birth_date,
      s.gender,
      s.class_id,
      s.created_at
    FROM attendance_records ar
    INNER JOIN students s ON s.id = ar.student_id
    WHERE ar.session_id = ?
    ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC
  `,
} as const
