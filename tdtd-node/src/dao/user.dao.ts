import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { UserRole, UserRow } from '../schema/types.js'

type UserDbRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  email_normalized: string
  password_hash: string
  role: UserRole
  is_active: number
  password_changed_at: number
  created_at: number
  updated_at: number | null
}

const USER_SELECT = `SELECT id, first_name, last_name, email, email_normalized, password_hash,
              role, is_active, password_changed_at, created_at, updated_at
       FROM users`

function mapRow(row: UserDbRow): UserRow {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    emailNormalized: row.email_normalized,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active === 1,
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  }
}

export function countUsers(db: SqliteDatabase): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }
  return row.c
}

export function findUserByEmailNormalized(
  db: SqliteDatabase,
  emailNormalized: string,
): UserRow | undefined {
  const row = db
    .prepare(`${USER_SELECT} WHERE email_normalized = ?`)
    .get(emailNormalized) as UserDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function findUserById(
  db: SqliteDatabase,
  id: string,
): UserRow | undefined {
  const row = db
    .prepare(`${USER_SELECT} WHERE id = ?`)
    .get(id) as UserDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function insertUser(
  db: SqliteDatabase,
  input: {
    id: string
    firstName: string
    lastName: string
    email: string
    emailNormalized: string
    passwordHash: string
    role: UserRole
    createdAt: number
  },
): UserRow {
  db.prepare(
    `INSERT INTO users (
      id, first_name, last_name, email, email_normalized, password_hash,
      role, is_active, password_changed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    input.id,
    input.firstName,
    input.lastName,
    input.email,
    input.emailNormalized,
    input.passwordHash,
    input.role,
    input.createdAt,
    input.createdAt,
  )
  return findUserById(db, input.id)!
}

export function updatePassword(
  db: SqliteDatabase,
  userId: string,
  passwordHash: string,
  changedAt: number,
): void {
  db.prepare(
    `UPDATE users SET password_hash = ?, password_changed_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(passwordHash, changedAt, changedAt, userId)
}
