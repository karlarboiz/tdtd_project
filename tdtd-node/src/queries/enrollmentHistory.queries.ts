/** SQL for enrollment history (GAP-099). */

export const ENROLLMENT_HISTORY_QUERIES = {
  insert: `
    INSERT INTO enrollment_history (
      id, student_id, school_year_id, grade_level, section_name,
      school_name, grades_snapshot_json, promotion_status, archived_at
    )
    VALUES (
      @id, @student_id, @school_year_id, @grade_level, @section_name,
      @school_name, @grades_snapshot_json, @promotion_status, @archived_at
    )
  `,
  listByStudent: `
    SELECT
      id, student_id, school_year_id, grade_level, section_name,
      school_name, grades_snapshot_json, promotion_status, archived_at
    FROM enrollment_history
    WHERE student_id = @student_id
    ORDER BY archived_at DESC
  `,
  listByClassYear: `
    SELECT
      eh.id, eh.student_id, eh.school_year_id, eh.grade_level, eh.section_name,
      eh.school_name, eh.grades_snapshot_json, eh.promotion_status, eh.archived_at
    FROM enrollment_history eh
    INNER JOIN students s ON s.id = eh.student_id
    WHERE s.class_id = @class_id
      AND eh.school_year_id = @school_year_id
    ORDER BY s.last_name COLLATE NOCASE ASC, s.first_name COLLATE NOCASE ASC
  `,
} as const
