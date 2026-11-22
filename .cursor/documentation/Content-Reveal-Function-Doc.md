# Content reveal — function documentation

Unified **enter animation** for list panels, detail views, and routed page bodies in `tdtd-frontend`. The app shell (header, nav) stays static.

Not tied to a SQLite schema. See [UI-Rules.md](../rules/UI-Rules.md) for layout; this doc is the canonical **content enter** spec. While data is fetching, use skeleton loading per [Loading-Skeleton-Function-Doc.md](./Loading-Skeleton-Function-Doc.md) (MOT-002).

---

## Entry MOT-001 — Unified content reveal

**Date:** 2026-06-03

**Summary:** One CSS-based fade-and-rise animation for lists, details, and page content inside `PageContainer`, without animating `AppShell` or the full viewport.

**Reason:** Give consistent feedback when teachers switch class, student, route, or filter—without the whole screen flashing or the header jumping.

**What changed:**

- **CSS:** `@keyframes tdtd-content-enter` and `.tdtd-content-enter` in `tdtd-frontend/src/index.css`; `contentRevealClass` in `tdtd-frontend/src/lib/uiClasses.ts`.
- **Components:** `ContentReveal` (optional `revealKey` remounts animation); `PageContentReveal` (default `revealKey` = `useLocation().pathname` for route changes).
- **Scope:** Wrap routed page bodies in `PageContentReveal` inside `PageContainer`. Wrap dynamic list/detail panels with `ContentReveal` and keys such as `classId`, `selectedClassId`, `eventId`, `studentId`, `gradeFilter`.
- **Never animate:** `AppShell`, `<Outlet />` in the shell, `#root`, or `main`.
- **Loading:** Plain “Loading…” text without `ContentReveal`; reveal **loaded** content only. Silent refresh (Recents, DueList) must not change `revealKey` in a way that replays the animation—those pages rely on route-level `PageContentReveal` only, not item-id keys.
- **Accessibility:** `@media (prefers-reduced-motion: reduce)` disables animation and transform.

**Animation spec:**

| Property | Value |
|----------|--------|
| Motion | `opacity` 0 → 1, `translateY` 6px → 0 |
| Duration | 200ms |
| Easing | `ease-out` |
| Stagger | None (one motion for whole panel) |

**Usage:**

```tsx
<PageContainer>
  <PageContentReveal>
    <h1>Page title</h1>
    <ContentReveal revealKey={classId}>
      {/* list that changes when class changes */}
    </ContentReveal>
  </PageContentReveal>
</PageContainer>
```

**Files involved:**

- `tdtd-frontend/src/index.css`
- `tdtd-frontend/src/lib/uiClasses.ts`
- `tdtd-frontend/src/components/ContentReveal/ContentReveal.tsx`
- `tdtd-frontend/src/layouts/PageContentReveal.tsx`
- `tdtd-frontend/src/pages/**/*.tsx` (all routed pages)
- `tdtd-frontend/src/components/DueList/DueList.tsx`
- `.cursor/documentation/Content-Reveal-Function-Doc.md`
- `.cursor/documentation/README.md`

**Schemas involved:**

- None
