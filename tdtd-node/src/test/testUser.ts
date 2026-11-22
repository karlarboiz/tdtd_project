import type { SqliteDatabase } from '../db/sqlite-types.js'
import { signup } from '../services/auth.service.js'

/** Creates a teacher account for integration tests (backfills orphan domain rows). */
export async function createTestUser(
  db: SqliteDatabase,
  email: string,
): Promise<string> {
  const res = await signup(db, {
    firstName: 'Test',
    lastName: 'Teacher',
    email,
    password: 'password123',
  })
  return res.user.id
}
