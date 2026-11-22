export const ATTENDANCE_QUERIES = {
  sessionByDatePeriod: `
    SELECT id, user_id, date, period, created_at
    FROM attendance_sessions
    WHERE user_id = ? AND date = ? AND period = ?
    LIMIT 1
  `,
  sessionById: `
    SELECT id, user_id, date, period, created_at
    FROM attendance_sessions
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `,
  sessionInsert: `
    INSERT INTO attendance_sessions (id, user_id, date, period, created_at)
    VALUES (@id, @user_id, @date, @period, @created_at)
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
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date
  `,
  sessionsInRange: `
    SELECT date, period
    FROM attendance_sessions
    WHERE user_id = ? AND date >= ? AND date <= ?
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
    INNER JOIN classes c ON c.id = s.class_id AND c.user_id = ?
    WHERE ar.session_id = ?
    ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC
  `,
} as const
