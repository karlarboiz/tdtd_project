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
  getById: `
    SELECT id, name, shift, created_at, updated_at
    FROM classes
    WHERE id = ?
  `,
  update: `
    UPDATE classes
    SET name = @name, shift = @shift, updated_at = @updated_at
    WHERE id = @id
  `,
  deleteById: `
    DELETE FROM classes
    WHERE id = ?
  `,
  deleteUsage: `
    SELECT
      (SELECT COUNT(*) FROM students WHERE class_id = ?) AS students,
      (SELECT COUNT(*) FROM class_subjects WHERE class_id = ?) AS class_subjects,
      (SELECT COUNT(*) FROM score_events WHERE class_id = ?) AS score_events
  `,
} as const
