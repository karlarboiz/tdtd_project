import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import { assertClassOwned, assertStudentOwned, assertSchoolYearOwned } from '../lib/ownership.js'
import * as deped from './deped.service.js'
import * as schoolSettings from './schoolSettings.service.js'

export type ReportForm = 'sf1' | 'sf2' | 'sf4' | 'sf5' | 'sf9' | 'sf10'

export type GenerateReportInput = {
  form: ReportForm
  classId?: string
  studentId?: string
  month?: string
  schoolYearId?: string
}

const FORM_TO_BATCH: Record<ReportForm, string> = {
  sf1: 'SF1_PDF',
  sf2: 'SF2_PDF',
  sf4: 'SF4_PDF',
  sf5: 'SF5_PDF',
  sf9: 'SF9_PDF',
  sf10: 'SF10_PDF',
}

function resolveBatchJar(): string {
  const candidates = [
    '/opt/tdtd/tdtd-batch-app.jar',
    path.join(process.cwd(), '..', 'tdtd-batch', 'tdtd-batch-app', 'target', 'tdtd-batch-app.jar'),
    path.join(process.cwd(), 'tdtd-batch', 'tdtd-batch-app', 'target', 'tdtd-batch-app.jar'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  throw new HttpError(503, 'batch jar not found; build tdtd-batch first')
}

function resolveDbPath(_db: SqliteDatabase): string {
  const env = process.env.TDTD_DB_PATH
  if (env) return path.resolve(env)
  return path.join(process.cwd(), 'data', 'teacher_app.sqlite')
}

export function generateReport(
  db: SqliteDatabase,
  userId: string,
  input: GenerateReportInput,
): { outputPath: string; form: ReportForm } {
  const form = input.form
  if (!FORM_TO_BATCH[form]) {
    throw new HttpError(400, 'invalid report form')
  }

  const classId = input.classId?.trim()
  const studentId = input.studentId?.trim()
  const month = input.month?.trim()
  const schoolYearId =
    input.schoolYearId?.trim() ?? deped.getActiveSchoolYearId(db, userId)

  if (['sf1', 'sf2', 'sf4', 'sf5'].includes(form) && !classId) {
    throw new HttpError(400, 'classId is required for this form')
  }
  if (['sf9', 'sf10'].includes(form) && !studentId && !classId) {
    throw new HttpError(400, 'studentId or classId is required')
  }
  if (['sf2', 'sf4'].includes(form) && !month) {
    throw new HttpError(400, 'month (YYYY-MM) is required for SF2/SF4')
  }

  if (classId) {
    assertClassOwned(db, classId, userId)
  }
  if (studentId) {
    assertStudentOwned(db, studentId, userId)
  }
  if (input.schoolYearId?.trim()) {
    assertSchoolYearOwned(db, input.schoolYearId.trim(), userId)
  }

  const outputDir = process.env.TDTD_REPORT_OUTPUT_DIR ?? 'data/reports'
  const jar = resolveBatchJar()
  const dbPath = resolveDbPath(db)

  const env = {
    ...process.env,
    TDTD_BATCH_RUN_ONCE: FORM_TO_BATCH[form],
    TDTD_DB_PATH: dbPath,
    TDTD_REPORT_OUTPUT_DIR: path.resolve(outputDir),
    TDTD_REPORT_USER_ID: userId,
    TDTD_REPORT_CLASS_ID: classId ?? '',
    TDTD_REPORT_STUDENT_ID: studentId ?? '',
    TDTD_REPORT_MONTH: month ?? '',
    TDTD_REPORT_SCHOOL_YEAR_ID: schoolYearId ?? '',
    TDTD_TIMEZONE: process.env.TDTD_TIMEZONE ?? 'Asia/Manila',
  }

  const result = spawnSync('java', ['-jar', jar], { env, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new HttpError(
      500,
      `report generation failed: ${result.stderr || result.stdout || 'unknown error'}`,
    )
  }

  const baseName = `${form}-${classId ?? studentId ?? 'export'}`
  const outputPath = path.join(path.resolve(outputDir), `${baseName}.pdf`)
  return { outputPath, form }
}

export function autoFillReportCardData(
  db: SqliteDatabase,
  userId: string,
  classId: string,
  schoolYearId?: string,
) {
  assertClassOwned(db, classId, userId)
  const syId = schoolYearId ?? deped.getActiveSchoolYearId(db, userId)
  if (!syId) throw new HttpError(400, 'no active school year')
  if (schoolYearId) {
    assertSchoolYearOwned(db, schoolYearId, userId)
  }

  for (const quarter of [1, 2, 3, 4]) {
    deped.computeGradesForClassQuarter(db, userId, classId, syId, quarter)
  }

  const settings = schoolSettings.getSchoolSettings(db, userId)
  deped.archiveEnrollmentForClass(
    db,
    userId,
    classId,
    syId,
    settings?.schoolName ?? 'School',
  )

  return deped.listGradesByClass(db, userId, classId, syId)
}
