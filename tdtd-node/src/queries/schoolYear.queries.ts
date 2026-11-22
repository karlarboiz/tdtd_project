export const SCHOOL_YEAR_QUERIES = {
  listAll: `
    SELECT id, user_id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    WHERE user_id = ?
    ORDER BY label DESC
  `,
  getById: `
    SELECT id, user_id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    WHERE id = ? AND user_id = ?
  `,
  getActive: `
    SELECT id, user_id, label, start_date, end_date, is_active, created_at, updated_at
    FROM school_years
    WHERE user_id = ? AND is_active = 1
    LIMIT 1
  `,
  insert: `
    INSERT INTO school_years (
      id, user_id, label, start_date, end_date, is_active, created_at, updated_at
    ) VALUES (
      @id, @user_id, @label, @start_date, @end_date, @is_active, @created_at, @updated_at
    )
  `,
  clearActive: `UPDATE school_years SET is_active = 0, updated_at = @updated_at WHERE user_id = @user_id`,
  setActive: `
    UPDATE school_years
    SET is_active = 1, updated_at = @updated_at
    WHERE id = @id AND user_id = @user_id
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
    INNER JOIN subjects s ON s.id = sys.subject_id AND s.user_id = @user_id
    WHERE sys.school_year_id = @school_year_id
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
    FROM class_subjects cs
    INNER JOIN classes c ON c.id = cs.class_id AND c.user_id = ?
    WHERE cs.subject_id = ?
    UNION
    SELECT 1 AS ok
    FROM score_events se
    INNER JOIN classes c ON c.id = se.class_id AND c.user_id = ?
    WHERE se.subject_id = ?
    LIMIT 1
  `,
  isSubjectRegisteredForActiveYear: `
    SELECT 1 AS ok
    FROM school_year_subjects sys
    INNER JOIN school_years sy ON sy.id = sys.school_year_id AND sy.is_active = 1 AND sy.user_id = ?
    WHERE sys.subject_id = ?
    LIMIT 1
  `,
} as const
