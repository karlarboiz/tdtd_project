# Function documentation index

Change history and feature notes for **Teacher's Dilemma Today**, organized by product area.

Canonical **table definitions** stay in [`.cursor/schemas/`](../schemas/). These files record **what we built, when, why**, and which files/schemas were involved.

**Planning** (not yet shipped): [Mobile-App-Version-Plan.md](./Mobile-App-Version-Plan.md). **Strategic alignment** (living): [Spec-Align-Doc.md](./Spec-Align-Doc.md) · [Gap-Backlog-Doc.md](./Gap-Backlog-Doc.md) — checklist audit and prioritized execution backlog.

## Documents

| Document | Scope |
|----------|--------|
| [Classes-Function-Doc.md](./Classes-Function-Doc.md) | Classes, student registration, shift/section roster rules |
| [Attendance-Function-Doc.md](./Attendance-Function-Doc.md) | Daily AM/PM attendance calendar, session save, roster |
| [Quiz-Function-Doc.md](./Quiz-Function-Doc.md) | Quiz, exam, and participation scores (`score_events`, `score_entries`) |
| [Subject-Function-Doc.md](./Subject-Function-Doc.md) | Subject catalog, school years, SY registration, class–subject links |
| [Recents-Function-Doc.md](./Recents-Function-Doc.md) | Teacher activity log (Recents page) |
| [App-Shell-Function-Doc.md](./App-Shell-Function-Doc.md) | Shared layout, logo, hamburger navigation |
| [Content-Reveal-Function-Doc.md](./Content-Reveal-Function-Doc.md) | Unified list/detail/page content enter animation (MOT-001) |
| [Loading-Skeleton-Function-Doc.md](./Loading-Skeleton-Function-Doc.md) | Unified skeleton loading while fetching backend data (MOT-002) |
| [Home-Page-Doc.md](./Home-Page-Doc.md) | Today dashboard (`/`) — due items, attendance CTA, missed work, Student Lab |
| [Student-Lab-Function-Doc.md](./Student-Lab-Function-Doc.md) | Per-student profile, attendance, and recent scores (view-only) |
| [Mobile-App-Version-Plan.md](./Mobile-App-Version-Plan.md) | Native app roadmap; offline-on-mobile-only checklist |
| [TDTD-Batch-Function.md](./TDTD-Batch-Function.md) | Scheduled batch jobs (`tdtd-batch`), attendance reminders, deployment |
| [Report-Generation-Function-Doc.md](./Report-Generation-Function-Doc.md) | Server-side PDF reports (`tdtd-batch`); v1 attendance session roster |
| [Due-List-Function-Doc.md](./Due-List-Function-Doc.md) | DueList — teacher “what’s still due” (attendance v1; extends reminders) |
| [Ngrok-Demo.md](./Ngrok-Demo.md) | Share local dev via ngrok (Option B: two tunnels + `VITE_API_URL`) |
| [Authentication-Function.md](./Authentication-Function.md) | Email/password signup & login, JWT + refresh tokens (AUTH-001) |
| [Spec-Align-Doc.md](./Spec-Align-Doc.md) | Product spec checklist vs shipped features; gap map and priority differentiators |
| [Gap-Backlog-Doc.md](./Gap-Backlog-Doc.md) | Prioritized `GAP-###` backlog mapped to existing plan docs and Spec-Align sections |
| [DepEd-School-Forms-Function-Doc.md](./DepEd-School-Forms-Function-Doc.md) | DepEd official forms (SF1, SF2, SF4, SF5, SF9, SF10): enrollment, attendance codes, grading, PDF/Excel export |
| [DepEd-Grading-Engine-Function-Doc.md](./DepEd-Grading-Engine-Function-Doc.md) | DepEd K–12 grading pipeline: WW/PT/QA, transmutation, quarter grades (GAP-080–082) |

## Entry format

Each change is one **entry** (newest at the top). Use ids like `ATT-001`, `QUIZ-001`, `SUB-001`.

Required fields: **Date**, **Summary**, **Reason**, **What changed**, **Files involved**, **Schemas involved**.

Use ids like `REC-001` for Recents entries and `APP-001` for app shell entries.
