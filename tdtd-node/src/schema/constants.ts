/**
 * SQLite identifiers aligned with migrate.ts DDL.
 */

export const TEACHER_APP_SQLITE_FILENAME = 'teacher_app.sqlite' as const

/** Logical table names (match .cursor/schemas — see README.md). */
export const TEACHER_APP_TABLES = [
  'classes',
  'students',
  'attendance_sessions',
  'attendance_records',
  'school_years',
  'subjects',
  'school_year_subjects',
  'class_subjects',
  'score_events',
  'score_entries',
  'activity_logs',
] as const

export type TeacherAppTableName = (typeof TEACHER_APP_TABLES)[number]
