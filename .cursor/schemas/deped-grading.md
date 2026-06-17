# DepEd grading model (GAP-080)

Design for quarter-based grading, WW/PT/QA weights, transmutation, and descriptors. Powers SF5, SF9, SF10 exports.

**Related:** [quiz.md](./quiz.md) · [deped-forms.md](./deped-forms.md) · [DepEd-Grading-Engine-Function-Doc.md](../documentation/DepEd-Grading-Engine-Function-Doc.md) · [DepEd-School-Forms-Function-Doc.md](../documentation/DepEd-School-Forms-Function-Doc.md)

---

## Quarters

Each **school year** has four quarters (Q1–Q4). Default date ranges (Philippines SY; configurable per school year — **post-MVP**, GAP-100):

| Quarter | Typical range |
|---------|---------------|
| Q1 | June – August |
| Q2 | September – October |
| Q3 | November – December |
| Q4 | January – March |

Stored on `score_events.quarter` (1–4, **required on create**) and used when computing `computed_subject_grades`.

---

## Assessment buckets (WW / PT / QA)

DepEd K–12 component weights (defaults; may vary by grade level — **configurable post-MVP**, GAP-103):

| Grade band | WW | PT | QA |
|------------|----|----|-----|
| Grades 1–6 | 30% | 50% | 20% |
| Grades 7–10 | 40% | 40% | 20% |
| Grades 11–12 | 25% | 50% | 25% |

**Mapping (GAP-081 — shipped MVP):**

| `score_events.kind` | `subtype` | `assessment_bucket` |
|-----------------------|-----------|---------------------|
| QUIZ | RZ, WZ, QZ | WW |
| PARTICIPATION | — | WW |
| EXAM | QE | QA |
| EXAM | (none) | WW (override to PT for performance tasks) |

Teachers may set `assessment_bucket` explicitly: **`WW` | `PT` | `QA`**. UI subtype codes stored on `score_events.subtype`.

---

## Quarter grade computation (GAP-082)

For each student, subject, quarter:

1. Collect all `score_entries` for events in that quarter + subject + class.
2. Per bucket: average raw scores (respecting `maxScore` → percentage if set).
3. Apply bucket weights → **quarter raw percentage** (`rawScore`).
4. **Transmute** to 60–100 scale (see table below).
5. Store in `computed_subject_grades`.

### Transmutation table (raw % → grade)

| Raw % | Transmuted |
|-------|------------|
| 100 | 100 |
| 98.40–99.99 | 99 |
| 96.80–98.39 | 98 |
| … | (DepEd standard table) |
| 0–3.99 | 60 |

Implementation: `tdtd-node/src/lib/transmutation.ts` — official DepEd lookup bands.

---

## Descriptors

| Transmuted grade | Descriptor |
|------------------|------------|
| 90–100 | Outstanding (O) |
| 85–89 | Very Satisfactory (VS) |
| 80–84 | Satisfactory (S) |
| 75–79 | Fairly Satisfactory (FS) |
| Below 75 | Did Not Meet Expectations (D) |

---

## Final grade and general average

- **Final grade per subject:** average of Q1–Q4 transmuted grades (or weighted by school policy). **Post-MVP** (GAP-101).
- **General average (GA):** mean of final grades across learning areas for the student.
- **Promotion (SF5):** PROMOTED if GA ≥ 75 and no subject below 75; CONDITIONAL/RETAINED per school rules.

---

## score_events (DepEd fields)

```
score_events: {
  ...
  quarter: number // 1–4, required on create
  assessmentBucket?: string // "WW" | "PT" | "QA"
  subtype?: string // UI code: RZ, WZ, QZ, QE
}
```

---

## computed_subject_grades table

```
computed_subject_grades: {
  id: string (uuid, primary key)
  studentId: string
  subjectId: string
  classId: string
  schoolYearId: string
  quarter: number // 1–4, or 0 for final (post-MVP)
  rawScore?: number // initial weighted grade before transmutation
  transmutedGrade?: number
  descriptor?: string
  finalGrade?: number // when quarter=0 or end-of-year
  manualOverride?: boolean
  computedAt: number (timestamp)
}
```

**Unique:** `(student_id, subject_id, school_year_id, quarter)`

---

## API (GAP-082)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/deped/classes/:classId/grades?quarter=&subjectId=&schoolYearId=` | List computed grades |
| POST | `/api/deped/classes/:classId/grades/compute` | Recompute from score events |
| PATCH | `/api/deped/classes/:classId/grades/:gradeId` | Manual override — **post-MVP** (GAP-102) |

Score event create: `POST /api/classes/:classId/score-events` with `quarter`, optional `subtype`, `assessmentBucket`.

---

## Post-MVP extensions

- `school_year_quarters` calendar config (GAP-100)
- Final grade row (`quarter = 0`) and class rank (GAP-101)
- Manual grade override API (GAP-102)
- Configurable WW/PT/QA weights (GAP-103)
- Performance exam subtype for PT (GAP-104)
- Conduct/values grades (SF9 section)
- Per-subject transmutation overrides
- SHS strand-specific weights (Grades 11–12)
