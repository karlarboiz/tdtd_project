# Recents function documentation

Teacher **activity log** — persisted on the server, shown at `/recents` and linked from the hamburger menu.

Schema: [recents.md](../schemas/recents.md).

---

## Entry REC-001 — Activity logs and Recents page (initial)

**Date:** 2026-05-25

**Summary:** SQLite `activity_logs`, `recordActivity` on core write paths, `GET /api/recents`, frontend Recents page and nav link.

**Reason:** Teachers need a single place to review what they did (imports, attendance, scores, subjects) without inferring history from each feature screen.

**What changed**

- Table `activity_logs` + migration
- Instrumentation: classes, students, attendance, school years, subjects, scores
- API `GET /api/recents`
- Page `tdtd-frontend/src/pages/Recents/Recents.tsx`, route `/recents`, hamburger **Recents** link

**Files involved**

- `tdtd-node/src/db/migrate.ts`, `activityLog.*`, `recents.routes.ts`, `ActivityActions.ts`
- Domain services: `class`, `student`, `attendance`, `schoolYear`, `score`
- `tdtd-frontend/src/pages/Recents`, `recentsApi.ts`, `activityLinks.ts`, `AppShell.tsx`, `App.tsx`

**Schemas involved**

- [recents.md](../schemas/recents.md)
