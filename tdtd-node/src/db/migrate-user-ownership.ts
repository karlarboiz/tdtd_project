import type { SqliteDatabase } from './sqlite-types.js'

function tableExists(db: SqliteDatabase, name: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
    )
    .get(name)
  return row !== undefined
}

function tableColumnNames(db: SqliteDatabase, table: string): Set<string> {
  if (!tableExists(db, table)) return new Set()
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return new Set(rows.map((r) => r.name))
}

/** First user by signup order — used to backfill pre-GAP-001 orphan rows. */
export function resolveBackfillUserId(db: SqliteDatabase): string | null {
  if (!tableExists(db, 'users')) return null
  const row = db
    .prepare(`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`)
    .get() as { id: string } | undefined
  return row?.id ?? null
}

/** Assign orphan domain rows (user_id IS NULL) to the given user — e.g. first signup. */
export function backfillOrphanDomainData(db: SqliteDatabase, userId: string): void {
  const tables = [
    'classes',
    'attendance_sessions',
    'subjects',
    'school_years',
    'school_settings',
    'grading_systems',
    'teacher_reminders',
    'activity_logs',
  ] as const
  for (const table of tables) {
    if (!tableExists(db, table)) continue
    const cols = tableColumnNames(db, table)
    if (!cols.has('user_id')) continue
    db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId)
  }
}

function migrateClassesUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'classes')) return
  if (tableColumnNames(db, 'classes').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE classes__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          shift TEXT NOT NULL CHECK (shift IN ('MRNG', 'AFTNN')),
          grade_level TEXT,
          section_name TEXT,
          class_adviser_name TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
        INSERT INTO classes__new (
          id, user_id, name, shift, grade_level, section_name, class_adviser_name,
          created_at, updated_at
        )
        SELECT
          id, '${backfillUserId}', name, shift, grade_level, section_name, class_adviser_name,
          created_at, updated_at
        FROM classes;
        DROP TABLE classes;
        ALTER TABLE classes__new RENAME TO classes;
        CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
      `)
    } else {
      db.exec(`ALTER TABLE classes ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateAttendanceSessionsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'attendance_sessions')) return
  const cols = tableColumnNames(db, 'attendance_sessions')
  if (cols.has('user_id')) {
    ensureAttendanceSessionsPerUserUnique(db)
    return
  }

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`DROP INDEX IF EXISTS idx_sessions_date`)
    const userIdExpr = backfillUserId ? `'${backfillUserId}'` : 'NULL'
    const userIdNotNull = backfillUserId ? 'NOT NULL' : ''
    db.exec(`
      CREATE TABLE attendance_sessions__new (
        id TEXT PRIMARY KEY,
        user_id TEXT ${userIdNotNull} REFERENCES users(id),
        date TEXT NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, date, period)
      );
      INSERT INTO attendance_sessions__new (id, user_id, date, period, created_at)
      SELECT id, ${userIdExpr}, date, period, created_at FROM attendance_sessions;
      DROP TABLE attendance_sessions;
      ALTER TABLE attendance_sessions__new RENAME TO attendance_sessions;
      CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON attendance_sessions(user_id, date);
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

/** Upgrade DBs that got user_id via ALTER but still have UNIQUE(date, period). */
function ensureAttendanceSessionsPerUserUnique(db: SqliteDatabase): void {
  const row = db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attendance_sessions'`,
    )
    .get() as { sql: string } | undefined
  if (!row?.sql) return
  if (row.sql.includes('UNIQUE(user_id, date, period)')) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`DROP INDEX IF EXISTS idx_sessions_date`)
    db.exec(`
      CREATE TABLE attendance_sessions__new (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        date TEXT NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
        created_at INTEGER NOT NULL,
        UNIQUE(user_id, date, period)
      );
      INSERT INTO attendance_sessions__new (id, user_id, date, period, created_at)
      SELECT id, user_id, date, period, created_at FROM attendance_sessions;
      DROP TABLE attendance_sessions;
      ALTER TABLE attendance_sessions__new RENAME TO attendance_sessions;
      CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON attendance_sessions(user_id, date);
    `)
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateSubjectsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'subjects')) return
  if (tableColumnNames(db, 'subjects').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_subjects_name_unique;
      DROP INDEX IF EXISTS idx_subjects_short_code_unique;
    `)
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE subjects__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          short_code TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
        INSERT INTO subjects__new (id, user_id, name, short_code, created_at, updated_at)
        SELECT id, '${backfillUserId}', name, short_code, created_at, updated_at FROM subjects;
        DROP TABLE subjects;
        ALTER TABLE subjects__new RENAME TO subjects;
        CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name COLLATE NOCASE);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_user_name_unique
          ON subjects(user_id, name COLLATE NOCASE);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_user_short_code_unique
          ON subjects(user_id, short_code COLLATE NOCASE)
          WHERE short_code IS NOT NULL AND TRIM(short_code) != '';
      `)
    } else {
      db.exec(`ALTER TABLE subjects ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateSchoolYearsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'school_years')) return
  if (tableColumnNames(db, 'school_years').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE school_years__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          label TEXT NOT NULL,
          start_date TEXT,
          end_date TEXT,
          is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        );
        INSERT INTO school_years__new (
          id, user_id, label, start_date, end_date, is_active, created_at, updated_at
        )
        SELECT id, '${backfillUserId}', label, start_date, end_date, is_active, created_at, updated_at
        FROM school_years;
        DROP TABLE school_years;
        ALTER TABLE school_years__new RENAME TO school_years;
        CREATE INDEX IF NOT EXISTS idx_school_years_user ON school_years(user_id);
        CREATE INDEX IF NOT EXISTS idx_school_years_active ON school_years(is_active);
      `)
    } else {
      db.exec(`ALTER TABLE school_years ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateSchoolSettingsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'school_settings')) return
  if (tableColumnNames(db, 'school_settings').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE school_settings__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          school_name TEXT NOT NULL,
          school_id TEXT,
          district TEXT,
          division TEXT,
          region TEXT,
          school_address TEXT,
          school_head_name TEXT,
          default_school_year_id TEXT,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (default_school_year_id) REFERENCES school_years(id),
          UNIQUE(user_id)
        );
        INSERT INTO school_settings__new (
          id, user_id, school_name, school_id, district, division, region,
          school_address, school_head_name, default_school_year_id, updated_at
        )
        SELECT
          id, '${backfillUserId}', school_name, school_id, district, division, region,
          school_address, school_head_name, default_school_year_id, updated_at
        FROM school_settings;
        DROP TABLE school_settings;
        ALTER TABLE school_settings__new RENAME TO school_settings;
      `)
    } else {
      db.exec(`ALTER TABLE school_settings ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateGradingSystemsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'grading_systems')) return
  if (tableColumnNames(db, 'grading_systems').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE grading_systems__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        INSERT INTO grading_systems__new (id, user_id, name, is_active, created_at, updated_at)
        SELECT id, '${backfillUserId}', name, is_active, created_at, updated_at FROM grading_systems;
        DROP TABLE grading_systems;
        ALTER TABLE grading_systems__new RENAME TO grading_systems;
        CREATE INDEX IF NOT EXISTS idx_grading_systems_user ON grading_systems(user_id);
      `)
    } else {
      db.exec(`ALTER TABLE grading_systems ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateTeacherRemindersUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'teacher_reminders')) return
  if (tableColumnNames(db, 'teacher_reminders').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    db.exec(`DROP INDEX IF EXISTS idx_teacher_reminders_open_unique`)
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE teacher_reminders__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          type TEXT NOT NULL CHECK (type IN ('ATTENDANCE_DUE')),
          date TEXT NOT NULL,
          period TEXT NOT NULL CHECK (period IN ('AM', 'PM')),
          status TEXT NOT NULL CHECK (status IN ('open', 'dismissed', 'resolved')),
          message TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          resolved_at INTEGER
        );
        INSERT INTO teacher_reminders__new (
          id, user_id, type, date, period, status, message, created_at, resolved_at
        )
        SELECT id, '${backfillUserId}', type, date, period, status, message, created_at, resolved_at
        FROM teacher_reminders;
        DROP TABLE teacher_reminders;
        ALTER TABLE teacher_reminders__new RENAME TO teacher_reminders;
        CREATE INDEX IF NOT EXISTS idx_teacher_reminders_status_date
          ON teacher_reminders(status, date);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_reminders_open_unique
          ON teacher_reminders(user_id, type, date, period)
          WHERE status = 'open';
      `)
    } else {
      db.exec(`ALTER TABLE teacher_reminders ADD COLUMN user_id TEXT REFERENCES users(id)`)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

function migrateActivityLogsUserId(db: SqliteDatabase, backfillUserId: string | null): void {
  if (!tableExists(db, 'activity_logs')) return
  if (tableColumnNames(db, 'activity_logs').has('user_id')) return

  db.pragma('foreign_keys = OFF')
  try {
    if (backfillUserId) {
      db.exec(`
        CREATE TABLE activity_logs__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          action TEXT NOT NULL,
          summary TEXT NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL
        );
        INSERT INTO activity_logs__new (id, user_id, action, summary, metadata, created_at)
        SELECT id, '${backfillUserId}', action, summary, metadata, created_at FROM activity_logs;
        DROP TABLE activity_logs;
        ALTER TABLE activity_logs__new RENAME TO activity_logs;
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
          ON activity_logs(user_id, created_at DESC);
      `)
    } else {
      db.exec(`ALTER TABLE activity_logs ADD COLUMN user_id TEXT REFERENCES users(id)`)
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
          ON activity_logs(created_at DESC)
      `)
    }
  } finally {
    db.pragma('foreign_keys = ON')
  }
}

/** GAP-001 — add user_id to teacher-mutable domain tables. */
export function migrateUserOwnershipTables(db: SqliteDatabase): void {
  const backfillUserId = resolveBackfillUserId(db)
  migrateClassesUserId(db, backfillUserId)
  migrateAttendanceSessionsUserId(db, backfillUserId)
  migrateSubjectsUserId(db, backfillUserId)
  migrateSchoolYearsUserId(db, backfillUserId)
  migrateSchoolSettingsUserId(db, backfillUserId)
  migrateGradingSystemsUserId(db, backfillUserId)
  migrateTeacherRemindersUserId(db, backfillUserId)
  migrateActivityLogsUserId(db, backfillUserId)
}
