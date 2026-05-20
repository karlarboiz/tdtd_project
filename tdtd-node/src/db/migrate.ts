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
      SELECT subject_id AS id FROM subjects
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
