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
