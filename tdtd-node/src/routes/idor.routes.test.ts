import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Server } from 'node:http'
import Sqlite from 'better-sqlite3'
import { migrate } from '../db/migrate.js'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { createApp } from '../app.js'
import { createClass } from '../services/class.service.js'
import { registerStudent } from '../services/student.service.js'
import { signup } from '../services/auth.service.js'
import { saveAttendance } from '../services/attendance.service.js'
import { createSchoolYear } from '../services/schoolYear.service.js'
import { HttpError } from '../errors/http-error.js'

let db: SqliteDatabase
let dbPath: string
let server: Server
let baseUrl: string

async function startServer(): Promise<void> {
  const app = createApp(db)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0
  baseUrl = `http://127.0.0.1:${port}/api`
}

async function stopServer(): Promise<void> {
  if (!server) return
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
}

async function api(
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown },
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {}
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts?.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }
  return { status: res.status, body }
}

beforeEach(async () => {
  dbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tdtd-idor-')),
    'test.sqlite',
  )
  db = new Sqlite(dbPath) as SqliteDatabase
  db.pragma('foreign_keys = ON')
  migrate(db)
  await startServer()
})

afterEach(async () => {
  await stopServer()
  db.close()
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true })
})

describe('GAP-002 HTTP IDOR', () => {
  it('user B cannot list user A classes', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: `alice-${Date.now()}@example.com`,
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: `bob-${Date.now()}@example.com`,
      password: 'password123',
    })

    createClass(db, userA.user.id, { name: 'Grade 5-A', shift: 'MRNG' })

    const listA = await api('GET', '/classes', { token: userA.accessToken })
    const listB = await api('GET', '/classes', { token: userB.accessToken })

    expect(listA.status).toBe(200)
    expect(listB.status).toBe(200)
    expect(Array.isArray(listA.body) && listA.body).toHaveLength(1)
    expect(Array.isArray(listB.body) && listB.body).toHaveLength(0)
  })

  it('user B gets 404 when accessing user A class by id', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: `alice2-${Date.now()}@example.com`,
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: `bob2-${Date.now()}@example.com`,
      password: 'password123',
    })

    const created = createClass(db, userA.user.id, {
      name: 'Private Class',
      shift: 'MRNG',
    })

    const res = await api('GET', `/classes/${created.id}/subjects`, {
      token: userB.accessToken,
    })
    expect(res.status).toBe(404)
  })

  it('user B cannot save attendance with user A student ids', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: `alice3-${Date.now()}@example.com`,
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: `bob3-${Date.now()}@example.com`,
      password: 'password123',
    })

    const classA = createClass(db, userA.user.id, {
      name: 'Grade 6-A',
      shift: 'MRNG',
    })
    const student = registerStudent(db, userA.user.id, {
      classId: classA.id,
      firstName: 'Sam',
      lastName: 'Student',
      birthDate: '2015-03-01',
      gender: 'M',
    })

    expect(() =>
      saveAttendance(db, userB.user.id, {
        date: '2026-05-28',
        period: 'AM',
        classStudentIds: [student.id],
        presentStudentIds: [student.id],
      }),
    ).toThrow(HttpError)
  })

  it('user B cannot read grades for user A class with foreign school year', async () => {
    const userA = await signup(db, {
      firstName: 'Alice',
      lastName: 'One',
      email: `alice4-${Date.now()}@example.com`,
      password: 'password123',
    })
    const userB = await signup(db, {
      firstName: 'Bob',
      lastName: 'Two',
      email: `bob4-${Date.now()}@example.com`,
      password: 'password123',
    })

    const classA = createClass(db, userA.user.id, {
      name: 'Grade 7-A',
      shift: 'MRNG',
    })
    const syA = createSchoolYear(db, userA.user.id, {
      label: '2025-2026',
      setActive: true,
    })
    createSchoolYear(db, userB.user.id, {
      label: '2025-2026',
      setActive: true,
    })

    const res = await api(
      'GET',
      `/deped/classes/${classA.id}/grades?schoolYearId=${syA.id}`,
      { token: userB.accessToken },
    )
    expect(res.status).toBe(404)
  })
})
