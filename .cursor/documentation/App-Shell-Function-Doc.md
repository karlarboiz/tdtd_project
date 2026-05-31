# App shell — function documentation

Shared **layout**, **branding**, and **navigation** for authenticated routes inside `AppShell`.

Not tied to a single SQLite schema; see [UI-Rules.md](../rules/UI-Rules.md) for palette and layout principles.

---

## Entry APP-001 — Logo branding and hamburger navigation

**Date:** 2026-05-26

**Summary:** App logo in header; primary nav collapsed behind a hamburger menu on small screens; **Recents** kept visible beside the menu (see [Recents-Function-Doc.md](./Recents-Function-Doc.md) REC-002).

**Reason:** Reduce header clutter on phones while keeping quick access to cross-cutting **Recents**; reinforce product identity with a consistent mark.

**What changed:**
- **`AppBrand` component:** Renders `/tdtd-logo.png` in header (compact); alt text “Teacher's Dilemma Today”.
- **`AppShell`:** Top bar with brand + Recents + hamburger; Home, Attendance, Classes & students, Subjects, and Scores in a collapsible panel (`#main-nav`).
- **Menu behavior:** Toggle open/close; closes on route change and **Escape**; `aria-expanded` / `aria-controls` on the menu button.
- **Home:** Content-first today dashboard — greeting, due items, contextual attendance CTA, missed-work summary, and Student Lab shortcut (no hero logo or nav link tiles; navigation lives in the shell only). See [Home-Page-Doc.md](./Home-Page-Doc.md).

**Files involved:**
- `tdtd-frontend/src/components/AppBrand/AppBrand.tsx`
- `tdtd-frontend/public/tdtd-logo.png`
- `tdtd-frontend/src/layouts/AppShell.tsx`
- `tdtd-frontend/src/pages/Home/Home.tsx`

**Schemas involved:**
- None
