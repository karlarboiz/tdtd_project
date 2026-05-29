# Classes & students — function documentation

Roster setup: **classes** (grade/group + morning or afternoon **section**) and **students** (manual entry or Excel import).

**Canonical schema:** [core.md](../schemas/core.md) — especially **Class shift and roster rules**.

**API bases:** `/api/classes`, `/api/students`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/classes` | List all classes (`name`, `shift`) |
| POST | `/api/classes` | Create class `{ name, shift }` — `shift` must be `MRNG` or `AFTNN` |
| GET | `/api/students?classId=` | List students in one class |
| POST | `/api/students` | Register one student `{ classId, firstName, … }` |
| POST | `/api/students/bulk` | Import many students into one class |

**Frontend routes:** `/classes` (Classes & students), `RegisterStudentsModal` from attendance and classes flows.

**Related:** [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) (AM → MRNG, PM → AFTNN), [Student-Lab-Function-Doc.md](./Student-Lab-Function-Doc.md) (shift-aware absent counts).

---

## Entry CLS-001 — Document class shift vs roster duplication

**Date:** 2026-05-29

**Summary:** Document how `name` + `shift` classify classes, why MRNG and AFTNN are separate sections, and the risk of registering the same children under both.

**Reason:** Teachers can create e.g. **Grade 6 · Morning (MRNG)** and **Grade 6 · Afternoon (AFTNN)** and import the same Excel twice. The app does not dedupe across classes; that inflates rosters and splits attendance/scores across duplicate student rows. Schema docs described `shift` for attendance filtering but not this operational pitfall.

**What changed:**
- **[core.md](../schemas/core.md):** New section **Class shift and roster rules** (intended model, do-not-mirror guidance, full-day limitation, enforcement table).
- **core.md anti-patterns:** Duplicate mirrored rosters, redundant naming, using two shifts for one full-day cohort.
- **core.md data integrity:** Clarified what is vs is not enforced in the API today.
- **core.md future extensions:** Optional `UNIQUE(name, shift)`, cross-class identity checks, full-day attendance model.
- **This file:** Classes & students function doc index and roster rules entry point.

**Files involved:**
- `.cursor/schemas/core.md`
- `.cursor/documentation/Classes-Function-Doc.md`
- `.cursor/documentation/README.md`

**Schemas involved:**
- [core.md](../schemas/core.md)
- [attendance.md](../schemas/attendance.md) — AM/MRNG, PM/AFTNN filtering (unchanged)

**Teacher guidance (operational)**

1. **One section = one class** — pick `MRNG` if this roster is your morning section, `AFTNN` if afternoon section.
2. **Do not** import the same list into both shifts unless they are actually different afternoon-section students.
3. If duplicates already exist, keep one canonical class, consolidate or remove the other class’s student rows (after backup), and stop re-importing into the duplicate.

**Not implemented (documented as future only)**

- Database `UNIQUE(name, shift)` on classes.
- API rejection of duplicate student identity across classes.
- UI warning when creating a class whose `name` already exists under the other `shift`.

---

## Entry CLS-000 — Core roster (baseline)

**Date:** (shipped before function doc index)

**Summary:** Classes with `name` + `shift`; students with profile fields and single `classId`; manual and Excel registration on `/classes` and `RegisterStudentsModal`.

**Reason:** Attendance, scores, and Student Lab all depend on a normalized roster in SQLite.

**What changed:**
- `classes` and `students` tables per [core.md](../schemas/core.md).
- `tdtd-node` class and student services; `tdtd-frontend` Classes page and registration modal.

**Files involved:**
- `tdtd-node/src/services/class.service.ts`, `student.service.ts`
- `tdtd-node/src/routes/class.routes.ts`, `student.routes.ts`
- `tdtd-frontend/src/pages/Classes/Classes.tsx`
- `tdtd-frontend/src/components/RegisterStudentsModal/RegisterStudentsModal.tsx`
- `tdtd-frontend/src/lib/classShift.ts`

**Schemas involved:**
- [core.md](../schemas/core.md)
