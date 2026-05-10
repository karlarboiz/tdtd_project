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
} as const
