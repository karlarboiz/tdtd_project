export const ACTIVITY_LOG_QUERIES = {
  insert: `
    INSERT INTO activity_logs (id, action, summary, metadata, created_at)
    VALUES (@id, @action, @summary, @metadata, @created_at)
  `,
  listRecent: `
    SELECT id, action, summary, metadata, created_at
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT ?
  `,
} as const
