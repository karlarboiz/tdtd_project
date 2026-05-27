# Function documentation index

Change history and feature notes for **Teacher's Dilemma Today**, organized by product area.

Canonical **table definitions** stay in [`.cursor/schemas/`](../schemas/). These files record **what we built, when, why**, and which files/schemas were involved.

**Planning** (not yet shipped): [Mobile-App-Version-Plan.md](./Mobile-App-Version-Plan.md).

## Documents

| Document | Scope |
|----------|--------|
| [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) | Daily AM/PM attendance calendar, session save, roster |
| [Quiz-Function-Doc.md](./Quiz-Function-Doc.md) | Quiz, exam, and participation scores (`score_events`, `score_entries`) |
| [Subject-Function-Doc.md](./Subject-Function-Doc.md) | Subject catalog, school years, SY registration, class–subject links |
| [Recents-Function-Doc.md](./Recents-Function-Doc.md) | Teacher activity log (Recents page) |
| [App-Shell-Function-Doc.md](./App-Shell-Function-Doc.md) | Shared layout, logo, hamburger navigation |
| [Student-Lab-Function-Doc.md](./Student-Lab-Function-Doc.md) | Per-student profile, attendance, and recent scores (view-only) |
| [Mobile-App-Version-Plan.md](./Mobile-App-Version-Plan.md) | Native app roadmap; offline-on-mobile-only checklist |
| [TDTD-Batch-Function.md](./TDTD-Batch-Function.md) | Scheduled batch jobs (`tdtd-batch`), attendance reminders, deployment |

## Entry format

Each change is one **entry** (newest at the top). Use ids like `ATT-001`, `QUIZ-001`, `SUB-001`.

Required fields: **Date**, **Summary**, **Reason**, **What changed**, **Files involved**, **Schemas involved**.

Use ids like `REC-001` for Recents entries and `APP-001` for app shell entries.
