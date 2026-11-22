# DepEd official school forms — schema mappings

Field mappings from DepEd form sections to TDTD tables/API. Used by [DepEd-School-Forms-Function-Doc.md](../documentation/DepEd-School-Forms-Function-Doc.md) and batch report renderers.

**Related:** [core.md](./core.md) · [attendance.md](./attendance.md) · [quiz.md](./quiz.md) · [deped-grading.md](./deped-grading.md)

---

## school_settings

Per-teacher school identity for form headers (GAP-001).

```
school_settings: {
  id: string (uuid, primary key)
  userId: string // FK → users.id — one row per teacher
  schoolName: string
  schoolId: string // BEIS ID
  district: string
  division: string
  region: string
  schoolAddress?: string
  schoolHeadName?: string
  defaultSchoolYearId?: string // FK → school_years.id (same teacher)
  updatedAt: number (timestamp)
}
```

**Unique:** `(user_id)` — one settings row per teacher.

---

## Extended classes

Additional columns on `classes`:

```
gradeLevel?: string // e.g. "5", "7", "11"
sectionName?: string // e.g. "Rose", "Apple"
classAdviserName?: string
```

---

## Extended students (enrollment)

Additional columns on `students` (GAP-087):

| Column | Type | SF1 | SF9 | SF10 |
|--------|------|-----|-----|------|
| lrn | string (12 digits, unique) | ✓ | ✓ | ✓ |
| learnerStatus | NEW \| TRANSFEREE \| CONTINUING | ✓ | | ✓ |
| houseNo, street, barangay, cityMunicipality, province | string | ✓ | ✓ | ✓ |
| fatherName, motherName, guardianName, parentContact | string | ✓ | ✓ | ✓ |
| motherTongue, religion | string | ✓ | | |
| is4ps, isIp | boolean | ✓ | | |
| dateEnrolled, previousSchool, lastGradeCompleted | string | ✓ | | ✓ |

---

## daily_attendance_records (GAP-088)

One coded mark per learner per school day (Option A — daily register layer).

```
daily_attendance_records: {
  id: string (uuid, primary key)
  studentId: string // FK → students.id
  date: string // YYYY-MM-DD (weekday school day)
  status: string // present | absent | late | excused
  classId: string // FK → classes.id (roster context)
  updatedAt: number (timestamp)
}
```

**Unique:** `(student_id, date)`

**DepEd mark symbols (SF2/SF4):**

| status | SF2 mark |
|--------|----------|
| present | (blank or ✓) |
| absent | x |
| late | T |
| excused | E |

**AM/PM transition:** Optional derivation from `attendance_records`: present if either AM or PM checked; absent if neither. Teachers may override via daily register UI.

---

## enrollment_history (GAP-099)

Multi-year archive for SF10.

```
enrollment_history: {
  id: string (uuid, primary key)
  studentId: string
  schoolYearId: string
  gradeLevel: string
  sectionName: string
  schoolName: string
  gradesSnapshotJson: string // JSON: subject → Q1–Q4, final, GA
  promotionStatus?: PROMOTED | CONDITIONAL | RETAINED
  archivedAt: number (timestamp)
}
```

---

## Form-specific mappings

### SF1 — School Register

See [DepEd-School-Forms-Function-Doc.md](../documentation/DepEd-School-Forms-Function-Doc.md) § Form catalog.

### SF2 — Daily Attendance

- Header: `school_settings` + `classes.grade_level`, `section_name`
- Rows: `students` in class, sorted by name
- Columns: school days in month from `daily_attendance_records`

### SF4 — Monthly Class Attendance

- Daily M/F present counts from `students.gender` + daily register
- Monthly tallies: count by status code

### SF5 — Promotion Report

- Per student: `computed_subject_grades.final_grade` per subject
- `enrollment_history.promotion_status`
- General average from grade computation service

### SF9 — Report Card

- Q1–Q4: `computed_subject_grades` filtered by quarter
- Descriptors from [deped-grading.md](./deped-grading.md)
- Attendance: rollup from `daily_attendance_records`

### SF10 — Permanent Record

- Cumulative: `enrollment_history` rows ordered by school year
- LRN + biodata from `students`

---

## Report batch triggers

| Form | `TDTD_BATCH_RUN_ONCE` | Key env vars |
|------|----------------------|--------------|
| SF1 | `SF1_PDF` | `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_SCHOOL_YEAR_ID` |
| SF2 | `SF2_PDF` | `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_MONTH` |
| SF4 | `SF4_PDF` | `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_MONTH` |
| SF5 | `SF5_PDF` | `TDTD_REPORT_CLASS_ID`, `TDTD_REPORT_SCHOOL_YEAR_ID` |
| SF9 | `SF9_PDF` | `TDTD_REPORT_STUDENT_ID` or `TDTD_REPORT_CLASS_ID` |
| SF10 | `SF10_PDF` | `TDTD_REPORT_STUDENT_ID` |

Output directory: `TDTD_REPORT_OUTPUT_DIR` (default `data/reports`).
