export const CLASS_QUERIES = {
  listByName: `
    SELECT
      id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    FROM classes
    ORDER BY name ASC
  `,
  insert: `
    INSERT INTO classes (
      id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    )
    VALUES (
      @id, @name, @shift, @grade_level, @section_name, @class_adviser_name,
      @created_at, @updated_at
    )
  `,
  getById: `
    SELECT
      id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    FROM classes
    WHERE id = ?
  `,
  updateMetadata: `
    UPDATE classes SET
      grade_level = @grade_level,
      section_name = @section_name,
      class_adviser_name = @class_adviser_name,
      updated_at = @updated_at
    WHERE id = @id
  `,
} as const
