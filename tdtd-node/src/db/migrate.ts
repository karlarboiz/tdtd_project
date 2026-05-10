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
 * Ensures `classes` matches Schema-Rules: name + shift (MRNG | AFTNN), no subject.
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

/** SQLite DDL aligned with Schema-Rules.md table shapes. */
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
  `)
}
