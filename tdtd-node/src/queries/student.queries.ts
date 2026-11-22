/** Parameterized SQL for students / class FK checks. */

export const STUDENT_QUERIES = {
  insert: `
    INSERT INTO students (
      id, first_name, middle_name, last_name, birth_date, gender, class_id, created_at
    )
    VALUES (
      @id, @first_name, @middle_name, @last_name, @birth_date, @gender, @class_id, @created_at
    )
  `,
  classExists: `
    SELECT 1 AS ok FROM classes WHERE id = ? LIMIT 1
  `,
  listByClass: `
    SELECT
      id,
      first_name,
      middle_name,
      last_name,
      birth_date,
      gender,
      class_id,
      created_at
    FROM students
    WHERE class_id = ?
    ORDER BY last_name COLLATE NOCASE ASC, first_name COLLATE NOCASE ASC
  `,
  classIdByStudentId: `
    SELECT class_id AS class_id FROM students WHERE id = ? LIMIT 1
  `,
  update: `
    UPDATE students
    SET
      first_name = @first_name,
      middle_name = @middle_name,
      last_name = @last_name,
      birth_date = @birth_date,
      gender = @gender,
      class_id = @class_id
    WHERE id = @id
  `,
  deleteById: `
    DELETE FROM students
    WHERE id = ?
  `,
  deleteUsage: `
    SELECT
      (SELECT COUNT(*) FROM attendance_records WHERE student_id = ?) AS attendance_records,
      (SELECT COUNT(*) FROM score_entries WHERE student_id = ?) AS score_entries
  `,
  getById: `
    SELECT
      id,
      first_name,
      middle_name,
      last_name,
      birth_date,
      gender,
      class_id,
      created_at
    FROM students
    WHERE id = ?
    LIMIT 1
  `,
} as const
