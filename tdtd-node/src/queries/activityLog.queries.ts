export const ACTIVITY_LOG_QUERIES = {
  insert: `
    INSERT INTO activity_logs (id, user_id, action, summary, metadata, created_at)
    VALUES (@id, @user_id, @action, @summary, @metadata, @created_at)
  `,
  listRecent: `
    SELECT id, user_id, action, summary, metadata, created_at
    FROM activity_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
} as const
