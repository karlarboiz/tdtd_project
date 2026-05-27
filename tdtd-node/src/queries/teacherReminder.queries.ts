export const TEACHER_REMINDER_QUERIES = {
  findOpenByTypeDatePeriod: `
    SELECT id, type, date, period, status, message, created_at, resolved_at
    FROM teacher_reminders
    WHERE type = ? AND date = ? AND period = ? AND status = 'open'
    LIMIT 1
  `,
  listOpenForDate: `
    SELECT id, type, date, period, status, message, created_at, resolved_at
    FROM teacher_reminders
    WHERE status = 'open' AND date = ?
    ORDER BY period ASC, created_at ASC
  `,
  insert: `
    INSERT INTO teacher_reminders (
      id, type, date, period, status, message, created_at, resolved_at
    )
    VALUES (
      @id, @type, @date, @period, @status, @message, @created_at, @resolved_at
    )
  `,
  updateStatus: `
    UPDATE teacher_reminders
    SET status = @status, resolved_at = @resolved_at
    WHERE id = @id
  `,
  resolveOpenByDatePeriod: `
    UPDATE teacher_reminders
    SET status = 'resolved', resolved_at = @resolved_at
    WHERE type = @type AND date = @date AND period = @period AND status = 'open'
  `,
  findById: `
    SELECT id, type, date, period, status, message, created_at, resolved_at
    FROM teacher_reminders
    WHERE id = ?
    LIMIT 1
  `,
} as const
