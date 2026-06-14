/** SQL for computed grades (GAP-082). */

export const GRADE_QUERIES = {
  deleteForClassQuarter: `
    DELETE FROM computed_subject_grades
    WHERE class_id = @class_id
      AND school_year_id = @school_year_id
      AND quarter = @quarter
      AND manual_override = 0
  `,
  upsert: `
    INSERT INTO computed_subject_grades (
      id, student_id, subject_id, class_id, school_year_id, quarter,
      transmuted_grade, descriptor, final_grade, manual_override, computed_at
    )
    VALUES (
      @id, @student_id, @subject_id, @class_id, @school_year_id, @quarter,
      @transmuted_grade, @descriptor, @final_grade, @manual_override, @computed_at
    )
    ON CONFLICT(student_id, subject_id, school_year_id, quarter) DO UPDATE SET
      transmuted_grade = excluded.transmuted_grade,
      descriptor = excluded.descriptor,
      final_grade = excluded.final_grade,
      manual_override = excluded.manual_override,
      computed_at = excluded.computed_at
  `,
  listByClass: `
    SELECT
      id, student_id, subject_id, class_id, school_year_id, quarter,
      transmuted_grade, descriptor, final_grade, manual_override, computed_at
    FROM computed_subject_grades
    WHERE class_id = @class_id
      AND school_year_id = @school_year_id
      AND (@quarter IS NULL OR quarter = @quarter)
    ORDER BY student_id, subject_id, quarter
  `,
  scoresForComputation: `
    SELECT
      se.id AS event_id,
      se.subject_id,
      se.quarter,
      se.assessment_bucket,
      se.max_score,
      ent.student_id,
      ent.score
    FROM score_events se
    INNER JOIN score_entries ent ON ent.event_id = se.id
    WHERE se.class_id = @class_id
      AND se.quarter = @quarter
      AND ent.score IS NOT NULL
  `,
} as const
