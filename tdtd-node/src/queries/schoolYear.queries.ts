export const SCHOOL_YEAR_QUERIES = {
  listAll: `
    SELECT id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    ORDER BY label DESC
  `,
  getById: `
    SELECT id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    WHERE id = ?
  `,
  getActive: `
    SELECT id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    WHERE is_active = 1
    LIMIT 1
  `,
  insert: `
    INSERT INTO school_years (
      id, label, start_date, end_date, is_active, created_at, updated_at
    ) VALUES (
      @id, @label, @start_date, @end_date, @is_active, @created_at, @updated_at
    )
  `,
  clearActive: `UPDATE school_years SET is_active = 0, updated_at = @updated_at`,
  setActive: `
    UPDATE school_years
    SET is_active = 1, updated_at = @updated_at
    WHERE id = @id
  `,
  listRegisteredSubjects: `
    SELECT
      sys.id,
      sys.school_year_id,
      sys.subject_id,
      sys.grade_level,
      sys.created_at,
      s.name AS subject_name,
      s.short_code AS subject_short_code
    FROM school_year_subjects sys
    INNER JOIN subjects s ON s.id = sys.subject_id
    WHERE sys.school_year_id = ?
    ORDER BY sys.grade_level COLLATE NOCASE ASC, s.name COLLATE NOCASE ASC
  `,
  insertRegistration: `
    INSERT INTO school_year_subjects (
      id, school_year_id, subject_id, grade_level, created_at
    )
    VALUES (@id, @school_year_id, @subject_id, @grade_level, @created_at)
  `,
  registrationExists: `
    SELECT 1 AS ok
    FROM school_year_subjects
    WHERE school_year_id = ? AND subject_id = ? AND grade_level = ?
    LIMIT 1
  `,
  deleteRegistrationById: `
    DELETE FROM school_year_subjects
    WHERE id = ? AND school_year_id = ?
  `,
  getRegistrationById: `
    SELECT id, school_year_id, subject_id, grade_level, created_at
    FROM school_year_subjects
    WHERE id = ? AND school_year_id = ?
  `,
  subjectUsedInClassOrScores: `
    SELECT 1 AS ok
    FROM class_subjects
    WHERE subject_id = ?
    UNION
    SELECT 1 AS ok
    FROM score_events
    WHERE subject_id = ?
    LIMIT 1
  `,
  isSubjectRegisteredForActiveYear: `
    SELECT 1 AS ok
    FROM school_year_subjects sys
    INNER JOIN school_years sy ON sy.id = sys.school_year_id AND sy.is_active = 1
    WHERE sys.subject_id = ?
    LIMIT 1
  `,
} as const
