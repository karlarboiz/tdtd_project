/**
 * SQLite identifiers aligned with migrate.ts DDL.
 */

export const TEACHER_APP_SQLITE_FILENAME = 'teacher_app.sqlite' as const

/** Logical table names (match Schema-Rules.md). */
export const TEACHER_APP_TABLES = [
  'classes',
  'students',
  'attendance_sessions',
  'attendance_records',
  'subjects',
  'class_subjects',
  'score_events',
  'score_entries',
] as const

export type TeacherAppTableName = (typeof TEACHER_APP_TABLES)[number]
