export const SUBJECT_QUERIES = {
  listByName: `
    SELECT id, name, short_code, created_at, updated_at
    FROM subjects
    ORDER BY name COLLATE NOCASE ASC
  `,
  insert: `
    INSERT INTO subjects (id, name, short_code, created_at, updated_at)
    VALUES (@id, @name, @short_code, @created_at, @updated_at)
  `,
} as const
