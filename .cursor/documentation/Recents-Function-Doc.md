# Recents function documentation

Teacher **activity log** — persisted on the server, shown at `/recents`, with a **Recents** link in the top header (beside the menu button).

Schema: [recents.md](../schemas/recents.md).

---

## Entry REC-002 — Recents UX, nav placement, refresh, and logging refinements

**Date:** 2026-05-26

**Summary:** Recents link moved beside the hamburger; page refetches reliably; score re-saves log as **Updated**; activity logging failures no longer block writes.

**Reason:** Teachers expected score edits to appear immediately in Recents; the initial nav buried Recents inside the collapsible menu; stale list data after saving elsewhere; logging must not break primary mutations.

**What changed:**
- **Header nav:** **Recents** sits to the left of the hamburger icon (always visible); primary routes stay inside the collapsible menu.
- **Recents page:** Refetch on route visit (`location.key`), on tab visibility return, and via a **Refresh** button; silent refresh shows “Refreshing…”.
- **Score activity text:** `replaceScoreEntries` logs **Saved scores for …** on first save and **Updated scores for …** when entries already existed (`SCORES_SAVED` action unchanged).
- **`recordActivity`:** Wrapped in try/catch — insert failure logs to console but does not roll back the domain transaction.
- **Grading hint:** Success message points users to Recents after save.
- **Deep links:** `activityLinks.ts` attendance href includes `?period=` via `attendanceSessionPath` when metadata has `date` (+ optional `period`).

**Files involved:**
- `tdtd-frontend/src/layouts/AppShell.tsx`
- `tdtd-frontend/src/pages/Recents/Recents.tsx`
- `tdtd-frontend/src/pages/ScoreGrading/ScoreGrading.tsx`
- `tdtd-frontend/src/lib/activityLinks.ts`
- `tdtd-frontend/src/lib/attendanceSessionRoute.ts`
- `tdtd-node/src/services/activityLog.service.ts`
- `tdtd-node/src/services/score.service.ts`
- `.cursor/schemas/recents.md` (SCORES_SAVED summary note)

**Schemas involved:**
- [recents.md](../schemas/recents.md) — `metadata.period` used for attendance deep links

---

## Entry REC-001 — Activity logs and Recents page (initial)

**Date:** 2026-05-25

**Summary:** SQLite `activity_logs`, `recordActivity` on core write paths, `GET /api/recents`, frontend Recents page and nav link.

**Reason:** Teachers need a single place to review what they did (imports, attendance, scores, subjects) without inferring history from each feature screen.

**What changed**

- Table `activity_logs` + migration
- Instrumentation: classes, students, attendance, school years, subjects, scores
- API `GET /api/recents`
- Page `tdtd-frontend/src/pages/Recents/Recents.tsx`, route `/recents`, **Recents** in main nav (later moved beside hamburger in REC-002)

**Files involved**

- `tdtd-node/src/db/migrate.ts`, `activityLog.*`, `recents.routes.ts`, `ActivityActions.ts`
- Domain services: `class`, `student`, `attendance`, `schoolYear`, `score`
- `tdtd-frontend/src/pages/Recents`, `recentsApi.ts`, `activityLinks.ts`, `AppShell.tsx`, `App.tsx`

**Schemas involved**

- [recents.md](../schemas/recents.md)
