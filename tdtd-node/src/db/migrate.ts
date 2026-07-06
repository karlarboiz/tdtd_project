import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from './sqlite-types.js'

function tableExists(db: SqliteDatabase, name: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
    )
    .get(name)
  return row !== undefined
}

function classColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(classes)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

function studentColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(students)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

function createStudentsIndexes(db: SqliteDatabase): void {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_sort ON students (
      class_id,
      last_name COLLATE NOCASE,
      first_name COLLATE NOCASE
    );
  `)
}

/**
 * Ensures `classes` matches .cursor/schemas/core.md: name + shift (MRNG | AFTNN), no subject.
 * Upgrades legacy DBs that had subject TEXT.
 */
export function migrateClassesTable(db: SqliteDatabase): void {
  if (!tableExists(db, 'classes')) {
    db.exec(`
      CREATE TABLE classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shift TEXT NOT NULL CHECK (shift IN ('MRNG', 'AFTNN')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER
      );
    `)
    return
  }

  const cols = classColumnNames(db)
  if (cols.has('shift') && !cols.has('subject')) {
    return
  }

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      CREATE TABLE classes__new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shift TEXT NOT NULL CHECK (shift IN ('MRNG', 'AFTNN')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER
      );
      INSERT INTO classes__new (id, name, shift, created_at, updated_at)
      SELECT id, name, 'MRNG', created_at, updated_at
      FROM classes;
      DROP TABLE classes;
      ALTER TABLE classes__new RENAME TO classes;
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

/**
 * Ensures `students` has first/middle/last, birth_date, gender (no legacy `name` only).
 */
export function migrateStudentsTable(db: SqliteDatabase): void {
  if (!tableExists(db, 'students')) {
    db.exec(`
      CREATE TABLE students (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
        class_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      );
    `)
    createStudentsIndexes(db)
    return
  }

  const cols = studentColumnNames(db)
  if (cols.has('first_name') && !cols.has('name')) {
    createStudentsIndexes(db)
    return
  }

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      CREATE TABLE students__new (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        birth_date TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('M', 'F', 'O')),
        class_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id)
      );
      INSERT INTO students__new (
        id,
        first_name,
        middle_name,
        last_name,
        birth_date,
        gender,
        class_id,
        created_at
      )
      SELECT
        id,
        CASE
          WHEN TRIM(COALESCE(name, '')) = '' THEN 'Migrated'
          ELSE TRIM(name)
        END,
        NULL,
        '',
        '1900-01-01',
        'O',
        class_id,
        created_at
      FROM students;
      DROP TABLE students;
      ALTER TABLE students__new RENAME TO students;
    `)
    createStudentsIndexes(db)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

/** Philippine-style default label from calendar date (June+ → Y-(Y+1), else (Y-1)-Y). */
export function defaultSchoolYearLabel(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  if (m >= 6) return `${y}-${y + 1}`
  return `${y - 1}-${y}`
}

/**
 * Adds school_years + school_year_subjects and backfills one active year for existing data.
 * See .cursor/schemas/subjects.md
 */
export function migrateSchoolYearTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_years (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_school_years_active ON school_years(is_active);

    CREATE TABLE IF NOT EXISTS school_year_subjects (
      id TEXT PRIMARY KEY,
      school_year_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (school_year_id) REFERENCES school_years(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      UNIQUE(school_year_id, subject_id, grade_level)
    );
    CREATE INDEX IF NOT EXISTS idx_sys_school_year ON school_year_subjects(school_year_id);
    CREATE INDEX IF NOT EXISTS idx_sys_subject ON school_year_subjects(subject_id);
  `)

  migrateSchoolYearSubjectsGradeLevel(db)

  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM school_years`)
    .get() as { n: number }
  if (count.n > 0) return

  const yearId = randomUUID()
  const now = Date.now()
  const label = defaultSchoolYearLabel()

  db.prepare(
    `INSERT INTO school_years (id, label, is_active, created_at) VALUES (?, ?, 1, ?)`,
  ).run(yearId, label, now)

  const subjectIds = db
    .prepare(
      `
      SELECT id FROM subjects
      UNION
      SELECT subject_id AS id FROM class_subjects
      UNION
      SELECT subject_id AS id FROM score_events
    `,
    )
    .all() as { id: string }[]

  const insertReg = db.prepare(`
    INSERT OR IGNORE INTO school_year_subjects (
      id, school_year_id, subject_id, grade_level, created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `)
  for (const { id: subjectId } of subjectIds) {
    insertReg.run(randomUUID(), yearId, subjectId, 'Unspecified', now)
  }
}

function schoolYearSubjectColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db
    .prepare(`PRAGMA table_info(school_year_subjects)`)
    .all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

/** Adds grade_level to school_year_subjects for DBs created before this column. */
export function migrateSchoolYearSubjectsGradeLevel(db: SqliteDatabase): void {
  if (!tableExists(db, 'school_year_subjects')) return
  const cols = schoolYearSubjectColumnNames(db)
  if (cols.has('grade_level')) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      CREATE TABLE school_year_subjects__new (
        id TEXT PRIMARY KEY,
        school_year_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        grade_level TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (school_year_id) REFERENCES school_years(id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id),
        UNIQUE(school_year_id, subject_id, grade_level)
      );
      INSERT INTO school_year_subjects__new (
        id, school_year_id, subject_id, grade_level, created_at
      )
      SELECT id, school_year_id, subject_id, 'Unspecified', created_at
      FROM school_year_subjects;
      DROP TABLE school_year_subjects;
      ALTER TABLE school_year_subjects__new RENAME TO school_year_subjects;
      CREATE INDEX IF NOT EXISTS idx_sys_school_year ON school_year_subjects(school_year_id);
      CREATE INDEX IF NOT EXISTS idx_sys_subject ON school_year_subjects(subject_id);
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

/** SQLite DDL aligned with .cursor/schemas (core, attendance, subjects, quiz). */
export function migrate(db: SqliteDatabase): void {
  migrateClassesTable(db)
  migrateStudentsTable(db)

  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
      created_at INTEGER NOT NULL,
      UNIQUE(date, period)
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON attendance_sessions(date);

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status = 'present'),
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(session_id, student_id)
    );
    CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
    CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS class_subjects (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      UNIQUE(class_id, subject_id)
    );
    CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
    CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);

    CREATE TABLE IF NOT EXISTS score_events (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('QUIZ', 'EXAM', 'PARTICIPATION')),
      title TEXT NOT NULL,
      date TEXT,
      max_score REAL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );
    CREATE INDEX IF NOT EXISTS idx_score_events_class_subject ON score_events(class_id, subject_id);
    CREATE INDEX IF NOT EXISTS idx_score_events_class_date ON score_events(class_id, date);
    CREATE INDEX IF NOT EXISTS idx_score_events_subject ON score_events(subject_id);

    CREATE TABLE IF NOT EXISTS score_entries (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      score REAL,
      note TEXT,
      recorded_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES score_events(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(event_id, student_id)
    );
    CREATE INDEX IF NOT EXISTS idx_score_entries_student ON score_entries(student_id);
  `)

  migrateSchoolYearTables(db)
  migrateSchoolYearSubjectsGradeLevel(db)
  migrateSubjectUniqueConstraints(db)
  migrateActivityLogsTable(db)
  migrateTeacherRemindersTable(db)
  migrateAuthTables(db)
  migrateAuthPasswordPolicy(db)
  migrateSyncTables(db)
  migrateGovernmentHolidaysTable(db)
  migrateDepEdTables(db)
}

/** Cached PH nationwide holidays scraped from Official Gazette proclamations. */
export function migrateGovernmentHolidaysTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS government_holidays (
      date TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('REGULAR', 'SPECIAL_NON_WORKING', 'SPECIAL_WORKING')),
      year INTEGER NOT NULL,
      proclamation TEXT,
      source_url TEXT,
      fetched_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_government_holidays_year
      ON government_holidays(year);
  `)
}

/** Per-user sync cursor for mobile pull/push — see .cursor/schemas/sync.md */
export function migrateSyncTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_device_state (
      user_id TEXT PRIMARY KEY,
      last_pull_cursor TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `)
}

/** Email/password auth — see .cursor/schemas/auth.md */
export function migrateAuthTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_normalized TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      password_changed_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized
      ON users(email_normalized);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL,
      replaced_by_token_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
      ON refresh_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
      ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
      ON refresh_tokens(expires_at);
  `)
}

function userColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

/** Password expiration + reset tokens — see .cursor/schemas/auth.md */
export function migrateAuthPasswordPolicy(db: SqliteDatabase): void {
  if (!tableExists(db, 'users')) return

  const cols = userColumnNames(db)
  if (!cols.has('password_changed_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN password_changed_at INTEGER`)
    db.exec(
      `UPDATE users SET password_changed_at = created_at WHERE password_changed_at IS NULL`,
    )
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
      ON password_reset_tokens(token_hash);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON password_reset_tokens(expires_at);
  `)
}

/** Scheduled / batch prompts — see .cursor/schemas/reminders.md */
export function migrateTeacherRemindersTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teacher_reminders (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('ATTENDANCE_DUE')),
      date TEXT NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
      status TEXT NOT NULL CHECK (status IN ('open', 'dismissed', 'resolved')),
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_reminders_status_date
      ON teacher_reminders(status, date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_reminders_open_unique
      ON teacher_reminders(type, date, period)
      WHERE status = 'open';
  `)
}

/** Teacher activity recents — see .cursor/schemas/recents.md */
export function migrateActivityLogsTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs(created_at DESC);
  `)
}

/** Unique indexes on subject name / short code when no legacy duplicates exist. */
export function migrateSubjectUniqueConstraints(db: SqliteDatabase): void {
  if (!tableExists(db, 'subjects')) return

  const dupName = db
    .prepare(
      `
      SELECT 1 AS ok FROM subjects
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
      LIMIT 1
    `,
    )
    .get() as { ok: 1 } | undefined

  if (!dupName) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_name_unique
      ON subjects(name COLLATE NOCASE);
    `)
  }

  const dupCode = db
    .prepare(
      `
      SELECT 1 AS ok FROM subjects
      WHERE short_code IS NOT NULL AND TRIM(short_code) != ''
      GROUP BY LOWER(TRIM(short_code))
      HAVING COUNT(*) > 1
      LIMIT 1
    `,
    )
    .get() as { ok: 1 } | undefined

  if (!dupCode) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_short_code_unique
      ON subjects(short_code COLLATE NOCASE)
      WHERE short_code IS NOT NULL AND TRIM(short_code) != '';
    `)
  }
}

function classDepEdColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(classes)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

function studentDepEdColumnNames(db: SqliteDatabase): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(students)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

function scoreEventDepEdColumnNames(db: SqliteDatabase): Set<string> {
  if (!tableExists(db, 'score_events')) return new Set()
  const rows = db.prepare(`PRAGMA table_info(score_events)`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

/** DepEd forms: school settings, enrollment fields, daily attendance, grading, enrollment history. */
export function migrateDepEdTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS school_settings (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      school_id TEXT,
      district TEXT,
      division TEXT,
      region TEXT,
      school_address TEXT,
      school_head_name TEXT,
      default_school_year_id TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (default_school_year_id) REFERENCES school_years(id)
    );

    CREATE TABLE IF NOT EXISTS daily_attendance_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
      class_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      UNIQUE(student_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_attendance_date ON daily_attendance_records(date);
    CREATE INDEX IF NOT EXISTS idx_daily_attendance_class ON daily_attendance_records(class_id);

    CREATE TABLE IF NOT EXISTS computed_subject_grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      school_year_id TEXT NOT NULL,
      quarter INTEGER NOT NULL CHECK (quarter >= 0 AND quarter <= 4),
      transmuted_grade REAL,
      descriptor TEXT,
      final_grade REAL,
      manual_override INTEGER NOT NULL DEFAULT 0 CHECK (manual_override IN (0, 1)),
      computed_at INTEGER NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (school_year_id) REFERENCES school_years(id),
      UNIQUE(student_id, subject_id, school_year_id, quarter)
    );
    CREATE INDEX IF NOT EXISTS idx_computed_grades_class ON computed_subject_grades(class_id, school_year_id);

    CREATE TABLE IF NOT EXISTS enrollment_history (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      school_year_id TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      section_name TEXT,
      school_name TEXT NOT NULL,
      grades_snapshot_json TEXT,
      promotion_status TEXT CHECK (promotion_status IN ('PROMOTED', 'CONDITIONAL', 'RETAINED')),
      archived_at INTEGER NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (school_year_id) REFERENCES school_years(id)
    );
    CREATE INDEX IF NOT EXISTS idx_enrollment_history_student ON enrollment_history(student_id);
  `)

  const classCols = classDepEdColumnNames(db)
  if (!classCols.has('grade_level')) {
    db.exec(`ALTER TABLE classes ADD COLUMN grade_level TEXT`)
  }
  if (!classCols.has('section_name')) {
    db.exec(`ALTER TABLE classes ADD COLUMN section_name TEXT`)
  }
  if (!classCols.has('class_adviser_name')) {
    db.exec(`ALTER TABLE classes ADD COLUMN class_adviser_name TEXT`)
  }

  const studentCols = studentDepEdColumnNames(db)
  const addStudentCol = (name: string, ddl: string) => {
    if (!studentCols.has(name)) {
      db.exec(`ALTER TABLE students ADD COLUMN ${name} ${ddl}`)
    }
  }
  addStudentCol('lrn', 'TEXT')
  addStudentCol('learner_status', 'TEXT')
  addStudentCol('house_no', 'TEXT')
  addStudentCol('street', 'TEXT')
  addStudentCol('barangay', 'TEXT')
  addStudentCol('city_municipality', 'TEXT')
  addStudentCol('province', 'TEXT')
  addStudentCol('father_name', 'TEXT')
  addStudentCol('mother_name', 'TEXT')
  addStudentCol('guardian_name', 'TEXT')
  addStudentCol('parent_contact', 'TEXT')
  addStudentCol('mother_tongue', 'TEXT')
  addStudentCol('religion', 'TEXT')
  addStudentCol('is_4ps', 'INTEGER DEFAULT 0')
  addStudentCol('is_ip', 'INTEGER DEFAULT 0')
  addStudentCol('date_enrolled', 'TEXT')
  addStudentCol('previous_school', 'TEXT')
  addStudentCol('last_grade_completed', 'TEXT')

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_students_lrn_unique
      ON students(lrn)
      WHERE lrn IS NOT NULL AND TRIM(lrn) != '';
  `)

  const scoreCols = scoreEventDepEdColumnNames(db)
  if (!scoreCols.has('quarter')) {
    db.exec(`ALTER TABLE score_events ADD COLUMN quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4)`)
  }
  if (!scoreCols.has('assessment_bucket')) {
    db.exec(`ALTER TABLE score_events ADD COLUMN assessment_bucket TEXT CHECK (assessment_bucket IN ('WW', 'PT', 'QA'))`)
  }

  migrateGradingSystems(db)
  migrateAttendanceStatusCodes(db)
}

/** Grading system profiles + WW/PT/QA component weights (GAP-103). */
function migrateGradingSystems(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS grading_systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grading_component_weights (
      id TEXT PRIMARY KEY,
      grading_system_id TEXT NOT NULL,
      grade_band_min INTEGER NOT NULL,
      grade_band_max INTEGER NOT NULL,
      ww_weight REAL NOT NULL,
      pt_weight REAL NOT NULL,
      qa_weight REAL NOT NULL,
      FOREIGN KEY (grading_system_id) REFERENCES grading_systems(id) ON DELETE CASCADE,
      UNIQUE (grading_system_id, grade_band_min, grade_band_max)
    );
    CREATE INDEX IF NOT EXISTS idx_grading_weights_system
      ON grading_component_weights(grading_system_id);
  `)

  const count = db
    .prepare(`SELECT COUNT(*) AS c FROM grading_systems`)
    .get() as { c: number }
  if (count.c > 0) return

  const systemId = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO grading_systems (id, name, is_active, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?)`,
  ).run(systemId, 'DepEd K–12 (Default)', now, now)

  const insertWeight = db.prepare(
    `INSERT INTO grading_component_weights (
      id, grading_system_id, grade_band_min, grade_band_max,
      ww_weight, pt_weight, qa_weight
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )

  const defaults: [number, number, number, number, number][] = [
    [1, 6, 0.3, 0.5, 0.2],
    [7, 10, 0.4, 0.4, 0.2],
    [11, 12, 0.25, 0.5, 0.25],
  ]
  for (const [min, max, ww, pt, qa] of defaults) {
    insertWeight.run(randomUUID(), systemId, min, max, ww, pt, qa)
  }
}

/** Allow absent/late/excused on attendance_records (rebuild CHECK). */
function migrateAttendanceStatusCodes(db: SqliteDatabase): void {
  if (!tableExists(db, 'attendance_records')) return
  const row = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attendance_records'`,
    )
    .get() as { sql: string } | undefined
  if (row?.sql.includes("'absent'")) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      CREATE TABLE attendance_records__new (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
        FOREIGN KEY (student_id) REFERENCES students(id),
        UNIQUE(session_id, student_id)
      );
      INSERT INTO attendance_records__new (id, session_id, student_id, status, timestamp)
      SELECT id, session_id, student_id, status, timestamp FROM attendance_records;
      DROP TABLE attendance_records;
      ALTER TABLE attendance_records__new RENAME TO attendance_records;
      CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
      CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
