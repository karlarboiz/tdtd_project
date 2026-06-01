# Home page — function documentation

The **Home** route (`/`) is the teacher's **today dashboard**. It answers: *"What should I do right now?"*

It is **not** a navigation launcher — primary routes live in [`AppShell`](./App-Shell-Function-Doc.md) only. Home surfaces actionable context: due attendance, a contextual next step, missed-work backlog, and quick access to [Student Lab](./Student-Lab-Function-Doc.md).

**Related:** [Due-List-Function-Doc.md](./Due-List-Function-Doc.md) · [Student-Lab-Function-Doc.md](./Student-Lab-Function-Doc.md) · [Recents-Function-Doc.md](./Recents-Function-Doc.md) · [UI-Rules.md](../rules/UI-Rules.md)

**Status:** Shipped (HOME-001)

---

## Three systems (do not mix)

| System | Question it answers | Where it lives |
|--------|---------------------|----------------|
| **Home / DueList** | What do I still need to do today? | Home due section, Attendance calendar |
| **DueList page** | What attendance am I still missing historically? | `/due-list` |
| **Recents** | What did I already do? | `/recents` (header link) |

Home composes widgets; it does not duplicate the full Recents feed or the full missed-work list.

---

## Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Greeting + today's date                                 │
├──────────────────────────┬──────────────────────────────┤
│ Due section              │ Missed work summary          │
│ Today attendance CTA     │ Student Lab shortcut         │
└──────────────────────────┴──────────────────────────────┘
  mobile: single column stack (same order)
```

- **Width:** `PageContainer` variant `standard` (centered in shell main region).
- **Desktop (`lg:`):** two-column grid — left: due + CTA; right: missed work + Student Lab.
- **Mobile:** single column, same section order top to bottom.
- **Branding:** no hero logo on Home; compact logo remains in `AppShell` header only.

---

## Sections

### Greeting

- Time-aware salutation: Good morning / Good afternoon / Good evening (local hour).
- Formatted date: weekday, month, day, year (browser locale).
- Implemented inline in `Home.tsx` (`getGreeting`, `formatTodayDate`).

### Due (`DueList`)

- Reuses [`DueList`](../../tdtd-frontend/src/components/DueList/DueList.tsx) with `showEmptyState`.
- Data from `useDueItems()` → `GET /api/due-list` (shared hook; Home passes items to avoid double-fetch).
- **When items exist:** amber alert cards with **Do it** (deep link) and **Dismiss** (`POST /api/reminders/:id/dismiss`).
- **When empty on Home only (`showEmptyState`):**
  - Weekday, caught up: teal-accent card — "You're all caught up for today."
  - Weekend: "No attendance due on weekends."
- **Attendance calendar:** still uses `DueList variant="compact"` without `showEmptyState` — section hidden when empty.

### Today attendance CTA (`TodayAttendanceCTA`)

- Single prominent action below the due section.
- **When due items exist:** primary indigo button (`primaryButtonClass`) linking to the first item's `actionPath`; label uses the item's `title` (e.g. "Take AM attendance for today").
- **When caught up:** secondary teal tile linking to `/attendance` — "View attendance calendar".
- Hidden while due items are loading.

### Missed work summary (`MissedWorkSummary`)

- Fetches `GET /api/due-list/missed` on mount, route change, and tab visibility return.
- Shows count of missed attendance sessions and optional date range (earliest – latest).
- Amber card styling consistent with DueListPage.
- **Hidden** when loading or count is 0.
- **Review missed work →** links to `/due-list`.

### Student Lab shortcut (`StudentLabShortcut`)

- Always visible white card in the right column.
- Brief copy: profile, attendance pattern, recent scores.
- **Open Student Lab →** links to `/student-lab` (picker).
- Complements shell nav — Home offers contextual discovery without a generic nav tile list.

---

## Data flow

```text
Home.tsx
  ├── useDueItems() ──────────► GET /api/due-list
  │     ├── DueList (showEmptyState, items, dismiss)
  │     └── TodayAttendanceCTA (dueItems, loading)
  ├── MissedWorkSummary ──────► GET /api/due-list/missed
  └── StudentLabShortcut ───► /student-lab (no API on Home)
```

Refresh pattern (due + missed): refetch on mount, `location.pathname` change, and `visibilitychange` when tab becomes visible.

---

## What Home deliberately excludes

- **Nav link tiles** — Attendance, Classes, Subjects, Scores, etc. are in `AppShell` hamburger only.
- **Hero logo** — removed; header `AppBrand` is sufficient.
- **Recents feed** — stays on `/recents` (header link).
- **New backend endpoints** — Home reuses existing due-list APIs only.

---

## Entry HOME-001 — Today dashboard redesign

**Date:** 2026-05-31

**Summary:** Replace generic nav-link launcher with a content-first today dashboard: greeting, due items with empty states, contextual attendance CTA, missed-work summary, and Student Lab shortcut.

**Reason:** Home duplicated every route already in `AppShell` and felt like a generic app menu. Teachers need Home to answer *what should I do now?* per [Due-List-Function-Doc.md](./Due-List-Function-Doc.md), not *where can I go?*

**What changed:**

- **Removed:** hero `AppBrand`, six nav link tiles (Start Attendance, DueList, Classes, Subjects, Scores, Student Lab).
- **Added:**
  - Greeting header (time + date).
  - `useDueItems` hook — shared fetch/dismiss for due items.
  - `TodayAttendanceCTA` — primary action from first due item or calendar fallback.
  - `MissedWorkSummary` — missed session count + link to `/due-list`.
  - `StudentLabShortcut` — card linking to `/student-lab`.
  - `DueList.showEmptyState` — positive empty cards on Home only.
- **Layout:** two-column grid on `lg:`, single column on mobile.

**Files involved:**

- `tdtd-frontend/src/pages/Home/Home.tsx`
- `tdtd-frontend/src/hooks/useDueItems.ts`
- `tdtd-frontend/src/components/DueList/DueList.tsx`
- `tdtd-frontend/src/components/TodayAttendanceCTA/TodayAttendanceCTA.tsx`
- `tdtd-frontend/src/components/MissedWorkSummary/MissedWorkSummary.tsx`
- `tdtd-frontend/src/components/StudentLabShortcut/StudentLabShortcut.tsx`
- `.cursor/documentation/Home-Page-Doc.md`
- `.cursor/documentation/App-Shell-Function-Doc.md`
- `.cursor/documentation/UI-Compliance-Checklist.md`

**Schemas involved:**

- None (Home is a composition layer; due data uses [reminders.md](../schemas/reminders.md) via existing APIs)

**API dependencies:**

| Widget | Endpoint |
|--------|----------|
| DueList / CTA | `GET /api/due-list` |
| DueList dismiss | `POST /api/reminders/:id/dismiss` |
| MissedWorkSummary | `GET /api/due-list/missed` |
| StudentLabShortcut | — (navigates to `/student-lab`) |

---

## Verify after changes

```bash
cd tdtd-frontend && npm run lint && npm run build
```
