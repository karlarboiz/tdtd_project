export const CLASS_QUERIES = {
  listByName: `
    SELECT
      id, user_id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    FROM classes
    WHERE user_id = ?
    ORDER BY name ASC
  `,
  insert: `
    INSERT INTO classes (
      id, user_id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @name, @shift, @grade_level, @section_name, @class_adviser_name,
      @created_at, @updated_at
    )
  `,
  getById: `
    SELECT
      id, user_id, name, shift, grade_level, section_name, class_adviser_name,
      created_at, updated_at
    FROM classes
    WHERE id = ? AND user_id = ?
  `,
  updateMetadata: `
    UPDATE classes SET
      grade_level = @grade_level,
      section_name = @section_name,
      class_adviser_name = @class_adviser_name,
      updated_at = @updated_at
    WHERE id = @id AND user_id = @user_id
  `,
} as const
