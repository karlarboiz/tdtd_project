export const SUBJECT_QUERIES = {
  listByName: `
    SELECT id, name, short_code, created_at, updated_at
    FROM subjects
    ORDER BY name COLLATE NOCASE ASC
  `,
  getByNameInsensitive: `
    SELECT id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE name = ? COLLATE NOCASE
    LIMIT 1
  `,
  getByShortCodeInsensitive: `
    SELECT id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE short_code = ? COLLATE NOCASE
    LIMIT 1
  `,
  insert: `
    INSERT INTO subjects (id, name, short_code, created_at, updated_at)
    VALUES (@id, @name, @short_code, @created_at, @updated_at)
  `,
} as const
