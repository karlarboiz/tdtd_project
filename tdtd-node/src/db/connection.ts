import fs from 'node:fs'
import path from 'node:path'
import Sqlite from 'better-sqlite3'
import { migrate } from './migrate.js'
import type { SqliteDatabase } from './sqlite-types.js'

let singleton: SqliteDatabase | undefined

export function getDbPath(): string {
  const raw = process.env.TDTD_DB_PATH
  if (!raw) {
    return path.resolve(process.cwd(), 'data/teacher_app.sqlite')
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
}

export function openDb(): SqliteDatabase {
  if (singleton) return singleton
  const dbPath = getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Sqlite(dbPath)
  db.pragma('foreign_keys = ON')
  migrate(db)
  singleton = db
  return db
}

export function closeDb(): void {
  if (singleton) {
    singleton.close()
    singleton = undefined
  }
}
