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
  created_at: number
  updated_at: number | null
}

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
    .prepare(
      `SELECT id, first_name, last_name, email, email_normalized, password_hash,
              role, is_active, created_at, updated_at
       FROM users WHERE email_normalized = ?`,
    )
    .get(emailNormalized) as UserDbRow | undefined
  return row ? mapRow(row) : undefined
}

export function findUserById(
  db: SqliteDatabase,
  id: string,
): UserRow | undefined {
  const row = db
    .prepare(
      `SELECT id, first_name, last_name, email, email_normalized, password_hash,
              role, is_active, created_at, updated_at
       FROM users WHERE id = ?`,
    )
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
      role, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    input.id,
    input.firstName,
    input.lastName,
    input.email,
    input.emailNormalized,
    input.passwordHash,
    input.role,
    input.createdAt,
  )
  return findUserById(db, input.id)!
}
