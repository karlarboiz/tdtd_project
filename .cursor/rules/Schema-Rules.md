# Schema-Rules.md

## 🧠 Purpose

This document defines the **official database schema and rules** for the Teacher Attendance App.

All code generated must strictly follow this schema.

The app is:
- **Backend-first**: canonical data lives in **SQLite** served by **tdtd-node** (Express REST API).
- **Frontend** (`tdtd-frontend`) talks to the API only; it does **not** embed an offline database.
- Limited offline / sync may be added later for specific features — not the default storage model.

DO NOT modify schema structure unless explicitly instructed.

**Scores (quizzes, exams, participation):** see [Score-Function-Schema-Rules.md](./Score-Function-Schema-Rules.md) — extends this document with `subjects`, `class_subjects`, `score_events`, and `score_entries`.

---

## ⚙️ Database

- **Server:** SQLite file (default `data/teacher_app.sqlite`), opened by `tdtd-node` (`better-sqlite3`).
- DDL and migrations: `tdtd-node/src/db/migrate.ts`
- **REST base path:** `/api` (see `tdtd-node/src/app.ts`)

---

## 📦 TABLES OVERVIEW

1. classes
2. students
3. attendance_sessions
4. attendance_records
5. subjects *(scores — see [Score-Function-Schema-Rules.md](./Score-Function-Schema-Rules.md))*
6. class_subjects *(scores)*
7. score_events *(scores)*
8. score_entries *(scores)*

Full field definitions and rules for tables 5–8 live in **Score-Function-Schema-Rules.md**; DDL is applied in `tdtd-node/src/db/migrate.ts`.

---

## 🧱 1. CLASSES TABLE

Represents a group of students (e.g., Grade 5).

### Structure:


classes: {
id: string (uuid, primary key)
name: string // e.g., "Grade 5"
shift: string // "MRNG" | "AFTNN" — morning vs afternoon section schedule
createdAt: number (timestamp)
updatedAt?: number (timestamp, optional)
}


### Rules:
- `id` must be unique (UUID)
- `name` is required
- `shift` is required: **`MRNG`** (morning section) or **`AFTNN`** (afternoon section)
- **Attendance UI:** when taking attendance for **AM**, only classes with **`shift = MRNG`** are offered; for **PM**, only **`shift = AFTNN`** (maps to `attendance_sessions.period`).
- Do NOT embed students inside this object

---

## 🧱 2. STUDENTS TABLE

Represents individual students.

### Structure:
students: {
id: string (uuid, primary key)
firstName: string
middleName?: string // optional — nullable in SQLite
lastName: string
birthDate: string // format: "YYYY-MM-DD"
gender: string // stored as "M" | "F" | "O" (Male / Female / Other)
classId: string // FK → classes.id
createdAt: number (timestamp)
}


### Rules:
- Each student belongs to ONE class
- `classId` must reference an existing class
- `firstName`, `lastName`, `birthDate`, and `gender` are required
- Display name in UI: combine `firstName` + optional `middleName` + `lastName`
- Do NOT store attendance data inside student

---

## 🧱 3. ATTENDANCE SESSIONS TABLE

Represents a single attendance event for a specific day and period.

### Structure:
attendance_sessions: {
id: string (uuid, primary key)
date: string // format: "YYYY-MM-DD"
period: string // "AM" | "PM"
createdAt: number (timestamp)
}


### Rules:
- One session per:
  → date + period
- Prevent duplicate sessions for same date + period
- Do NOT include classId here
- This is a GLOBAL attendance session

---

## 🧱 4. ATTENDANCE RECORDS TABLE

Represents attendance status per student in a session.

### Structure:
attendance_records: {
id: string (uuid, primary key)
sessionId: string // FK → attendance_sessions.id
studentId: string // FK → students.id
status: string // "present"
timestamp: number
}


### Rules:
- One record per student per session
- `status` for MVP:
  - Only "present"
  - (absence = no record OR unchecked)
- Must reference valid session and student

---

## 🔗 RELATIONSHIPS
Class
└── Students

Attendance Session (date + period)
└── Attendance Records
└── Student


---

## ⚡ REQUIRED INDEXES (SQLite)

See `migrate.ts`: primary keys, `UNIQUE(date, period)` on `attendance_sessions`,
`UNIQUE(session_id, student_id)` on `attendance_records`, and supporting indexes on foreign keys and lookup columns.


---

## 🧠 BUSINESS LOGIC RULES

### Attendance Logic

- Attendance is taken:
  - Once in the morning (AM)
  - Once in the afternoon (PM)

- When saving attendance:
  1. Check if session exists for:
     - selected date
     - selected period
  2. If NOT → create new session
  3. Insert attendance records for checked students

---

### Student Registration

- Students can be added:
  - Manually (first / middle / last name, birth date, gender)
  - Via Excel import

- Excel import (**row 1 = headers**):
  - Required columns: **firstName**, **lastName**, **birthDate**, **gender**
  - Optional column: **middleName** (column may be omitted; cells may be empty)
  - **birthDate:** preferably `YYYY-MM-DD` (other common date strings may be accepted in the client parser)
  - **gender:** `M` / `F` / `O` or `Male` / `Female` / `Other` (normalized to M/F/O in the API)
  - Ignore completely empty data rows; trim whitespace on text fields
  - Sample file includes a **header row** plus example rows for teachers

---

### Data Integrity

- Do NOT:
  - Duplicate students unnecessarily
  - Create multiple sessions for same date + period (DB enforces `UNIQUE(date, period)`)
  - Store nested objects in tables

- API business logic in **tdtd-node** should enforce the same rules when accepting writes.

---

## 🚫 ANTI-PATTERNS (STRICTLY FORBIDDEN)

❌ Embedding students inside class  
❌ Storing attendance inside student object  
❌ Adding classId to attendance_sessions  
❌ Creating deeply nested structures  
❌ Using arrays as primary storage  

---

## ✅ EXPECTED USAGE FLOW

1. Create class
2. Add students
3. Select date
4. Determine period (AM/PM)
5. Create/reuse attendance session
6. Save attendance records

---

## 🎯 DESIGN PRINCIPLES

- Keep schema flat and relational
- Optimize for fast reads/writes on the server
- Optionally support **targeted** offline/sync later (not global IndexedDB mirroring)
- Keep future extensibility (grades, reports)

---

## 🔮 FUTURE EXTENSIONS (DO NOT IMPLEMENT YET)

- Add status:
  - "absent"
  - "late"

- Add weighted grading / term averages (built on score_events + score_entries)
- Add DepEd report generation
- Selective client-side caching or sync for specific flows

---

## 📌 FINAL NOTE

This schema is optimized for:
→ Speed  
→ Simplicity  
→ Real teacher workflows  
→ Single source of truth on the server  

Any generated code MUST follow this structure exactly.

