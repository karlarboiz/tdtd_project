export const CLASS_QUERIES = {
  listByName: `
    SELECT id, name, shift, created_at, updated_at
    FROM classes
    ORDER BY name ASC
  `,
  insert: `
    INSERT INTO classes (id, name, shift, created_at, updated_at)
    VALUES (@id, @name, @shift, @created_at, @updated_at)
  `,
} as const
