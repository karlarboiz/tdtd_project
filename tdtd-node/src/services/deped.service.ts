import { randomUUID } from 'node:crypto'

import type { SqliteDatabase } from '../db/sqlite-types.js'

import type {

  AssessmentBucket,

  AttendanceRecordStatus,

  ComputedSubjectGradeRow,

  DailyAttendanceRecordRow,

  EnrollmentHistoryRow,

  PromotionStatus,

} from '../schema/types.js'

import { HttpError } from '../errors/http-error.js'
import { DAILY_ATTENDANCE_QUERIES } from '../queries/dailyAttendance.queries.js'

import { GRADE_QUERIES } from '../queries/grade.queries.js'

import { ENROLLMENT_HISTORY_QUERIES } from '../queries/enrollmentHistory.queries.js'

import {

  descriptorForGrade,

  promotionStatusForGa,

  transmuteRawPercent,

} from '../lib/transmutation.js'

import { resolveComponentWeights } from '../lib/gradingWeights.js'

import { assertClassOwned, assertStudentOwned, assertSchoolYearOwned } from '../lib/ownership.js'
import * as schoolYearDao from '../dao/schoolYear.dao.js'



type DailyDbRow = {

  id: string

  student_id: string

  date: string

  status: AttendanceRecordStatus

  class_id: string

  updated_at: number

}



export function upsertDailyAttendance(

  db: SqliteDatabase,

  userId: string,

  row: Omit<DailyAttendanceRecordRow, 'id'> & { id?: string },

): DailyAttendanceRecordRow {

  assertClassOwned(db, row.classId, userId)
  const student = assertStudentOwned(db, row.studentId, userId)
  if (student.classId !== row.classId) {
    throw new HttpError(400, 'student does not belong to class')
  }

  const id = row.id ?? randomUUID()

  const ts = row.updatedAt ?? Date.now()

  db.prepare(DAILY_ATTENDANCE_QUERIES.upsert).run({

    id,

    student_id: row.studentId,

    date: row.date,

    status: row.status,

    class_id: row.classId,

    updated_at: ts,

  })

  return { ...row, id, updatedAt: ts }

}



export function listDailyAttendanceByClassMonth(

  db: SqliteDatabase,

  userId: string,

  classId: string,

  fromDate: string,

  toDate: string,

): DailyAttendanceRecordRow[] {

  assertClassOwned(db, classId, userId)

  const rows = db.prepare(DAILY_ATTENDANCE_QUERIES.listByClassMonth).all({

    class_id: classId,

    from_date: fromDate,

    to_date: toDate,

  }) as DailyDbRow[]

  return rows.map((r) => ({

    id: r.id,

    studentId: r.student_id,

    date: r.date,

    status: r.status,

    classId: r.class_id,

    updatedAt: r.updated_at,

  }))

}



type GradeDbRow = {

  id: string

  student_id: string

  subject_id: string

  class_id: string

  school_year_id: string

  quarter: number

  transmuted_grade: number | null

  descriptor: string | null

  final_grade: number | null

  manual_override: number

  computed_at: number

}



function mapGrade(r: GradeDbRow): ComputedSubjectGradeRow {

  return {

    id: r.id,

    studentId: r.student_id,

    subjectId: r.subject_id,

    classId: r.class_id,

    schoolYearId: r.school_year_id,

    quarter: r.quarter,

    transmutedGrade: r.transmuted_grade ?? undefined,

    descriptor: r.descriptor ?? undefined,

    finalGrade: r.final_grade ?? undefined,

    manualOverride: r.manual_override === 1,

    computedAt: r.computed_at,

  }

}



export function computeGradesForClassQuarter(

  db: SqliteDatabase,

  userId: string,

  classId: string,

  schoolYearId: string,

  quarter: number,

): ComputedSubjectGradeRow[] {

  const classRow = assertClassOwned(db, classId, userId)

  assertSchoolYearOwned(db, schoolYearId, userId)

  const weights = resolveComponentWeights(db, userId, classRow.gradeLevel ?? '6')



  const scoreRows = db.prepare(GRADE_QUERIES.scoresForComputation).all({

    class_id: classId,

    quarter,

  }) as {

    event_id: string

    subject_id: string

    quarter: number

    assessment_bucket: AssessmentBucket | null

    max_score: number | null

    student_id: string

    score: number

  }[]



  type Key = string

  const bucketScores = new Map<Key, number[]>()



  for (const r of scoreRows) {

    const bucket = r.assessment_bucket ?? 'WW'

    const key = `${r.student_id}:${r.subject_id}:${bucket}`

    const pct =

      r.max_score && r.max_score > 0 ? (r.score / r.max_score) * 100 : r.score

    const list = bucketScores.get(key) ?? []

    list.push(pct)

    bucketScores.set(key, list)

  }



  const studentSubjects = new Set<string>()

  for (const r of scoreRows) {

    studentSubjects.add(`${r.student_id}:${r.subject_id}`)

  }



  db.prepare(GRADE_QUERIES.deleteForClassQuarter).run({

    class_id: classId,

    school_year_id: schoolYearId,

    quarter,

  })



  const computed: ComputedSubjectGradeRow[] = []

  const now = Date.now()



  for (const ss of studentSubjects) {

    const [studentId, subjectId] = ss.split(':')

    const avg = (bucket: AssessmentBucket) => {

      const key = `${studentId}:${subjectId}:${bucket}`

      const vals = bucketScores.get(key) ?? []

      if (vals.length === 0) return 0

      return vals.reduce((a, b) => a + b, 0) / vals.length

    }

    const ww = avg('WW')

    const pt = avg('PT')

    const qa = avg('QA')

    const raw = ww * weights.ww + pt * weights.pt + qa * weights.qa

    const transmuted = transmuteRawPercent(raw)

    const descriptor = descriptorForGrade(transmuted)



    const row: ComputedSubjectGradeRow = {

      id: randomUUID(),

      studentId: studentId!,

      subjectId: subjectId!,

      classId,

      schoolYearId,

      quarter,

      transmutedGrade: transmuted,

      descriptor,

      finalGrade: transmuted,

      manualOverride: false,

      computedAt: now,

    }



    db.prepare(GRADE_QUERIES.upsert).run({

      id: row.id,

      student_id: row.studentId,

      subject_id: row.subjectId,

      class_id: row.classId,

      school_year_id: row.schoolYearId,

      quarter: row.quarter,

      transmuted_grade: row.transmutedGrade,

      descriptor: row.descriptor,

      final_grade: row.finalGrade,

      manual_override: 0,

      computed_at: row.computedAt,

    })

    computed.push(row)

  }



  return computed

}



export function listGradesByClass(

  db: SqliteDatabase,

  userId: string,

  classId: string,

  schoolYearId: string,

  quarter?: number,

): ComputedSubjectGradeRow[] {

  assertClassOwned(db, classId, userId)
  assertSchoolYearOwned(db, schoolYearId, userId)

  const rows = db.prepare(GRADE_QUERIES.listByClass).all({

    class_id: classId,

    school_year_id: schoolYearId,

    quarter: quarter ?? null,

  }) as GradeDbRow[]

  return rows.map(mapGrade)

}



export function archiveEnrollmentForClass(

  db: SqliteDatabase,

  userId: string,

  classId: string,

  schoolYearId: string,

  schoolName: string,

): EnrollmentHistoryRow[] {

  const classRow = assertClassOwned(db, classId, userId)
  assertSchoolYearOwned(db, schoolYearId, userId)

  const grades = listGradesByClass(db, userId, classId, schoolYearId, 0)

  const students = db

    .prepare(

      `SELECT id, class_id FROM students WHERE class_id = ? ORDER BY last_name COLLATE NOCASE`,

    )

    .all(classId) as { id: string; class_id: string }[]



  const archived: EnrollmentHistoryRow[] = []

  const now = Date.now()



  for (const s of students) {

    const studentGrades = grades.filter((g) => g.studentId === s.id && g.quarter > 0)

    const ga =

      studentGrades.length > 0

        ? studentGrades.reduce((sum, g) => sum + (g.transmutedGrade ?? 0), 0) /

          studentGrades.length

        : 0

    const promotion = promotionStatusForGa(ga) as PromotionStatus



    const snapshot = JSON.stringify({

      grades: studentGrades,

      generalAverage: Math.round(ga * 100) / 100,

    })



    const row: EnrollmentHistoryRow = {

      id: randomUUID(),

      studentId: s.id,

      schoolYearId,

      gradeLevel: classRow.gradeLevel ?? classRow.name ?? '',

      sectionName: classRow.sectionName,

      schoolName,

      gradesSnapshotJson: snapshot,

      promotionStatus: promotion,

      archivedAt: now,

    }



    db.prepare(ENROLLMENT_HISTORY_QUERIES.insert).run({

      id: row.id,

      student_id: row.studentId,

      school_year_id: row.schoolYearId,

      grade_level: row.gradeLevel,

      section_name: row.sectionName ?? null,

      school_name: row.schoolName,

      grades_snapshot_json: row.gradesSnapshotJson,

      promotion_status: row.promotionStatus,

      archived_at: row.archivedAt,

    })

    archived.push(row)

  }



  return archived

}



export function listEnrollmentHistoryByStudent(

  db: SqliteDatabase,

  userId: string,

  studentId: string,

): EnrollmentHistoryRow[] {

  assertStudentOwned(db, studentId, userId)

  const rows = db.prepare(ENROLLMENT_HISTORY_QUERIES.listByStudent).all({

    student_id: studentId,

  }) as {

    id: string

    student_id: string

    school_year_id: string

    grade_level: string

    section_name: string | null

    school_name: string

    grades_snapshot_json: string | null

    promotion_status: PromotionStatus | null

    archived_at: number

  }[]



  return rows.map((r) => ({

    id: r.id,

    studentId: r.student_id,

    schoolYearId: r.school_year_id,

    gradeLevel: r.grade_level,

    sectionName: r.section_name ?? undefined,

    schoolName: r.school_name,

    gradesSnapshotJson: r.grades_snapshot_json ?? undefined,

    promotionStatus: r.promotion_status ?? undefined,

    archivedAt: r.archived_at,

  }))

}



export function getActiveSchoolYearId(

  db: SqliteDatabase,

  userId: string,

): string | undefined {

  const row = schoolYearDao.getActiveSchoolYear(db, userId)

  return row?.id

}


