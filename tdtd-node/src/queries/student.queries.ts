/** Parameterized SQL for students / class FK checks. */

const STUDENT_COLS = `
  id, first_name, middle_name, last_name, birth_date, gender, class_id,
  lrn, learner_status, house_no, street, barangay, city_municipality, province,
  father_name, mother_name, guardian_name, parent_contact,
  mother_tongue, religion, is_4ps, is_ip,
  date_enrolled, previous_school, last_grade_completed, created_at
`

const STUDENT_COLS_FROM_ALIAS = `
  s.id, s.first_name, s.middle_name, s.last_name, s.birth_date, s.gender, s.class_id,
  s.lrn, s.learner_status, s.house_no, s.street, s.barangay, s.city_municipality, s.province,
  s.father_name, s.mother_name, s.guardian_name, s.parent_contact,
  s.mother_tongue, s.religion, s.is_4ps, s.is_ip,
  s.date_enrolled, s.previous_school, s.last_grade_completed, s.created_at
`

export const STUDENT_QUERIES = {
  insert: `
    INSERT INTO students (
      id, first_name, middle_name, last_name, birth_date, gender, class_id,
      lrn, learner_status, house_no, street, barangay, city_municipality, province,
      father_name, mother_name, guardian_name, parent_contact,
      mother_tongue, religion, is_4ps, is_ip,
      date_enrolled, previous_school, last_grade_completed, created_at
    )
    VALUES (
      @id, @first_name, @middle_name, @last_name, @birth_date, @gender, @class_id,
      @lrn, @learner_status, @house_no, @street, @barangay, @city_municipality, @province,
      @father_name, @mother_name, @guardian_name, @parent_contact,
      @mother_tongue, @religion, @is_4ps, @is_ip,
      @date_enrolled, @previous_school, @last_grade_completed, @created_at
    )
  `,
  updateProfile: `
    UPDATE students SET
      first_name = @first_name,
      middle_name = @middle_name,
      last_name = @last_name,
      birth_date = @birth_date,
      gender = @gender,
      lrn = @lrn,
      learner_status = @learner_status,
      house_no = @house_no,
      street = @street,
      barangay = @barangay,
      city_municipality = @city_municipality,
      province = @province,
      father_name = @father_name,
      mother_name = @mother_name,
      guardian_name = @guardian_name,
      parent_contact = @parent_contact,
      mother_tongue = @mother_tongue,
      religion = @religion,
      is_4ps = @is_4ps,
      is_ip = @is_ip,
      date_enrolled = @date_enrolled,
      previous_school = @previous_school,
      last_grade_completed = @last_grade_completed
    WHERE id = @id
  `,
  classExists: `
    SELECT 1 AS ok FROM classes WHERE id = ? AND user_id = ? LIMIT 1
  `,
  getByIdForUser: `
    SELECT ${STUDENT_COLS_FROM_ALIAS}
    FROM students s
    INNER JOIN classes c ON c.id = s.class_id AND c.user_id = ?
    WHERE s.id = ?
    LIMIT 1
  `,
  listByClass: `
    SELECT ${STUDENT_COLS}
    FROM students
    WHERE class_id = ?
    ORDER BY last_name COLLATE NOCASE ASC, first_name COLLATE NOCASE ASC
  `,
  classIdByStudentId: `
    SELECT class_id AS class_id FROM students WHERE id = ? LIMIT 1
  `,
  getById: `
    SELECT ${STUDENT_COLS}
    FROM students
    WHERE id = ?
    LIMIT 1
  `,
} as const
