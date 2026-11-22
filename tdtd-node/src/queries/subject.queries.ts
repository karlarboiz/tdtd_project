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
  getById: `
    SELECT id, name, short_code, created_at, updated_at
    FROM subjects
    WHERE id = ?
    LIMIT 1
  `,
  insert: `
    INSERT INTO subjects (id, name, short_code, created_at, updated_at)
    VALUES (@id, @name, @short_code, @created_at, @updated_at)
  `,
  update: `
    UPDATE subjects
    SET name = @name, short_code = @short_code, updated_at = @updated_at
    WHERE id = @id
  `,
  deleteById: `
    DELETE FROM subjects
    WHERE id = ?
  `,
  deleteUsage: `
    SELECT
      (SELECT COUNT(*) FROM school_year_subjects WHERE subject_id = ?) AS school_year_subjects,
      (SELECT COUNT(*) FROM class_subjects WHERE subject_id = ?) AS class_subjects,
      (SELECT COUNT(*) FROM score_events WHERE subject_id = ?) AS score_events
  `,
} as const
