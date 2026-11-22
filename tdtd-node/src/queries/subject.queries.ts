export const SUBJECT_QUERIES = {
  listByName: `
    SELECT id, user_id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE user_id = ?
    ORDER BY name COLLATE NOCASE ASC
  `,
  getByNameInsensitive: `
    SELECT id, user_id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE user_id = ? AND name = ? COLLATE NOCASE
    LIMIT 1
  `,
  getByShortCodeInsensitive: `
    SELECT id, user_id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE user_id = ? AND short_code = ? COLLATE NOCASE
    LIMIT 1
  `,
  insert: `
    INSERT INTO subjects (id, user_id, name, short_code, created_at, updated_at)
    VALUES (@id, @user_id, @name, @short_code, @created_at, @updated_at)
  `,
  exists: `
    SELECT 1 AS ok FROM subjects WHERE id = ? AND user_id = ? LIMIT 1
  `,
} as const
