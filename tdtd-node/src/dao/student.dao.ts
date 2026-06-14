import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { LearnerStatus, StudentGenderCode, StudentRow } from '../schema/types.js'
import { STUDENT_QUERIES } from '../queries/student.queries.js'

type StudentDbRow = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  birth_date: string
  gender: StudentGenderCode
  class_id: string
  lrn: string | null
  learner_status: string | null
  house_no: string | null
  street: string | null
  barangay: string | null
  city_municipality: string | null
  province: string | null
  father_name: string | null
  mother_name: string | null
  guardian_name: string | null
  parent_contact: string | null
  mother_tongue: string | null
  religion: string | null
  is_4ps: number | null
  is_ip: number | null
  date_enrolled: string | null
  previous_school: string | null
  last_grade_completed: string | null
  created_at: number
}

function mapStudentDbRow(r: StudentDbRow): StudentRow {
  return {
    id: r.id,
    firstName: r.first_name,
    middleName: r.middle_name ?? undefined,
    lastName: r.last_name,
    birthDate: r.birth_date,
    gender: r.gender,
    classId: r.class_id,
    lrn: r.lrn ?? undefined,
    learnerStatus: (r.learner_status as LearnerStatus) ?? undefined,
    houseNo: r.house_no ?? undefined,
    street: r.street ?? undefined,
    barangay: r.barangay ?? undefined,
    cityMunicipality: r.city_municipality ?? undefined,
    province: r.province ?? undefined,
    fatherName: r.father_name ?? undefined,
    motherName: r.mother_name ?? undefined,
    guardianName: r.guardian_name ?? undefined,
    parentContact: r.parent_contact ?? undefined,
    motherTongue: r.mother_tongue ?? undefined,
    religion: r.religion ?? undefined,
    is4ps: r.is_4ps === 1,
    isIp: r.is_ip === 1,
    dateEnrolled: r.date_enrolled ?? undefined,
    previousSchool: r.previous_school ?? undefined,
    lastGradeCompleted: r.last_grade_completed ?? undefined,
    createdAt: r.created_at,
  }
}

function studentToParams(row: StudentRow) {
  return {
    id: row.id,
    first_name: row.firstName,
    middle_name: row.middleName ?? null,
    last_name: row.lastName,
    birth_date: row.birthDate,
    gender: row.gender,
    class_id: row.classId,
    lrn: row.lrn ?? null,
    learner_status: row.learnerStatus ?? null,
    house_no: row.houseNo ?? null,
    street: row.street ?? null,
    barangay: row.barangay ?? null,
    city_municipality: row.cityMunicipality ?? null,
    province: row.province ?? null,
    father_name: row.fatherName ?? null,
    mother_name: row.motherName ?? null,
    guardian_name: row.guardianName ?? null,
    parent_contact: row.parentContact ?? null,
    mother_tongue: row.motherTongue ?? null,
    religion: row.religion ?? null,
    is_4ps: row.is4ps ? 1 : 0,
    is_ip: row.isIp ? 1 : 0,
    date_enrolled: row.dateEnrolled ?? null,
    previous_school: row.previousSchool ?? null,
    last_grade_completed: row.lastGradeCompleted ?? null,
    created_at: row.createdAt,
  }
}

export function classExists(db: SqliteDatabase, classId: string): boolean {
  const row = db.prepare(STUDENT_QUERIES.classExists).get(classId) as
    | { ok: 1 }
    | undefined
  return row !== undefined
}

export function insertStudent(db: SqliteDatabase, row: StudentRow): void {
  db.prepare(STUDENT_QUERIES.insert).run(studentToParams(row))
}

export function updateStudentProfile(db: SqliteDatabase, row: StudentRow): void {
  db.prepare(STUDENT_QUERIES.updateProfile).run(studentToParams(row))
}

export function getClassIdForStudent(
  db: SqliteDatabase,
  studentId: string,
): string | undefined {
  const row = db.prepare(STUDENT_QUERIES.classIdByStudentId).get(studentId) as
    | { class_id: string }
    | undefined
  return row?.class_id
}

export function getStudentById(
  db: SqliteDatabase,
  studentId: string,
): StudentRow | undefined {
  const row = db.prepare(STUDENT_QUERIES.getById).get(studentId) as
    | StudentDbRow
    | undefined
  return row ? mapStudentDbRow(row) : undefined
}

export function listStudentsByClass(
  db: SqliteDatabase,
  classId: string,
): StudentRow[] {
  const rows = db.prepare(STUDENT_QUERIES.listByClass).all(classId) as StudentDbRow[]
  return rows.map(mapStudentDbRow)
}
