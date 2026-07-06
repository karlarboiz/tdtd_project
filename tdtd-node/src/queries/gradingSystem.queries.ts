/** SQL for grading system profiles and component weights (GAP-103). */

export const GRADING_SYSTEM_QUERIES = {
  list: `
    SELECT id, name, is_active, created_at, updated_at
    FROM grading_systems
    ORDER BY is_active DESC, name COLLATE NOCASE ASC
  `,
  getById: `
    SELECT id, name, is_active, created_at, updated_at
    FROM grading_systems
    WHERE id = @id
  `,
  getActive: `
    SELECT id, name, is_active, created_at, updated_at
    FROM grading_systems
    WHERE is_active = 1
    LIMIT 1
  `,
  insert: `
    INSERT INTO grading_systems (id, name, is_active, created_at, updated_at)
    VALUES (@id, @name, @is_active, @created_at, @updated_at)
  `,
  deactivateAll: `
    UPDATE grading_systems SET is_active = 0, updated_at = @updated_at
  `,
  activate: `
    UPDATE grading_systems
    SET is_active = 1, updated_at = @updated_at
    WHERE id = @id
  `,
  nameExists: `
    SELECT 1 FROM grading_systems
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(@name))
      AND (@exclude_id IS NULL OR id != @exclude_id)
    LIMIT 1
  `,
  listWeightsBySystem: `
    SELECT
      id, grading_system_id, grade_band_min, grade_band_max,
      ww_weight, pt_weight, qa_weight
    FROM grading_component_weights
    WHERE grading_system_id = @grading_system_id
    ORDER BY grade_band_min ASC
  `,
  listWeightsForActiveSystem: `
    SELECT
      w.id, w.grading_system_id, w.grade_band_min, w.grade_band_max,
      w.ww_weight, w.pt_weight, w.qa_weight
    FROM grading_component_weights w
    INNER JOIN grading_systems g ON g.id = w.grading_system_id
    WHERE g.is_active = 1
    ORDER BY w.grade_band_min ASC
  `,
  deleteWeightsForSystem: `
    DELETE FROM grading_component_weights
    WHERE grading_system_id = @grading_system_id
  `,
  insertWeight: `
    INSERT INTO grading_component_weights (
      id, grading_system_id, grade_band_min, grade_band_max,
      ww_weight, pt_weight, qa_weight
    ) VALUES (
      @id, @grading_system_id, @grade_band_min, @grade_band_max,
      @ww_weight, @pt_weight, @qa_weight
    )
  `,
} as const
