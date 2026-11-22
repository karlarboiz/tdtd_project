# Loading skeleton — function documentation

Unified **skeleton placeholders** while backend data is fetching in `tdtd-frontend`. Pairs with [Content-Reveal (MOT-001)](./Content-Reveal-Function-Doc.md): skeleton = waiting; content reveal = loaded.

Not tied to a SQLite schema.

---

## Entry MOT-002 — Unified loading skeleton

**Date:** 2026-06-03

**Summary:** Pulse skeleton placeholders for all explicit fetch loading states; silent refresh keeps visible content.

**Reason:** Teachers need clear feedback during API calls without blank layout jumps or plain “Loading…” text.

**What changed:**

- **CSS:** `@keyframes tdtd-skeleton-pulse` and `.tdtd-skeleton` in `tdtd-frontend/src/index.css`; `skeletonClass` in `tdtd-frontend/src/lib/uiClasses.ts`.
- **Components:** `LoadingSkeleton/` primitives and variants (`DueListSkeleton`, `RecentsSkeleton`, `CardSkeleton`, `TableSkeleton`, `ScoreRosterSkeleton`, `ProfileDetailSkeleton`, etc.).
- **Rules:** Initial load (`loading && !hasCachedData`) shows skeleton; silent refresh does not replace list with skeleton; in-panel reload skeleton only in that panel.
- **Surfaces:** DueList, DueListPage, Recents, MissedWorkSummary, TodayAttendanceCTA, Subjects, Scores, ScoreGrading, StudentLab, StudentLabPicker, AttendanceSession.

**Skeleton spec:**

| Property | Value |
|----------|--------|
| Fill | `bg-slate-200` (Due cards: amber-tinted shells) |
| Motion | opacity pulse ~1.5s ease-in-out infinite |
| Accessibility | `role="status"`, `aria-busy="true"`, visually hidden label; `prefers-reduced-motion` disables pulse |

**Files involved:**

- `tdtd-frontend/src/index.css`
- `tdtd-frontend/src/lib/uiClasses.ts`
- `tdtd-frontend/src/components/LoadingSkeleton/**`
- `tdtd-frontend/src/components/DueList/DueList.tsx`
- `tdtd-frontend/src/components/MissedWorkSummary/MissedWorkSummary.tsx`
- `tdtd-frontend/src/components/TodayAttendanceCTA/TodayAttendanceCTA.tsx`
- `tdtd-frontend/src/pages/DueList/DueListPage.tsx`
- `tdtd-frontend/src/pages/Recents/Recents.tsx`
- `tdtd-frontend/src/pages/Subjects/Subjects.tsx`
- `tdtd-frontend/src/pages/Scores/Scores.tsx`
- `tdtd-frontend/src/pages/ScoreGrading/ScoreGrading.tsx`
- `tdtd-frontend/src/pages/StudentLab/StudentLab.tsx`
- `tdtd-frontend/src/pages/StudentLabPicker/StudentLabPicker.tsx`
- `tdtd-frontend/src/pages/AttendanceSession/AttendanceSession.tsx`
- `.cursor/documentation/Loading-Skeleton-Function-Doc.md`
- `.cursor/documentation/README.md`

**Schemas involved:**

- None
