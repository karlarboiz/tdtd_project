/** SQL for daily attendance register (GAP-088). */

export const DAILY_ATTENDANCE_QUERIES = {
  upsert: `
    INSERT INTO daily_attendance_records (
      id, student_id, date, status, class_id, updated_at
    )
    VALUES (
      @id, @student_id, @date, @status, @class_id, @updated_at
    )
    ON CONFLICT(student_id, date) DO UPDATE SET
      status = excluded.status,
      class_id = excluded.class_id,
      updated_at = excluded.updated_at
  `,
  listByClassMonth: `
    SELECT
      dar.id,
      dar.student_id,
      dar.date,
      dar.status,
      dar.class_id,
      dar.updated_at
    FROM daily_attendance_records dar
    INNER JOIN students s ON s.id = dar.student_id
    WHERE s.class_id = @class_id
      AND dar.date >= @from_date
      AND dar.date <= @to_date
    ORDER BY dar.date ASC, s.last_name COLLATE NOCASE ASC
  `,
  listByStudentMonth: `
    SELECT id, student_id, date, status, class_id, updated_at
    FROM daily_attendance_records
    WHERE student_id = @student_id
      AND date >= @from_date
      AND date <= @to_date
    ORDER BY date ASC
  `,
  countByStatus: `
    SELECT status, COUNT(*) AS n
    FROM daily_attendance_records dar
    INNER JOIN students s ON s.id = dar.student_id
    WHERE s.class_id = @class_id
      AND dar.date >= @from_date
      AND dar.date <= @to_date
    GROUP BY status
  `,
} as const
