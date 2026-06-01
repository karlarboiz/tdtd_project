# UI & standard rules — compliance checklist

Tracks alignment with [UI-Rules.md](../rules/UI-Rules.md) and [Standard-Rules.md](../rules/Standard-Rules.md) for `tdtd-frontend`.

## Palette & theme

- [x] Theme tokens in `tdtd-frontend/src/index.css`: primary `#4F46E5`, secondary `#14B8A6`, accent `#FB7185`, neutral background `#F1F5F9`
- [x] Label text token `neutral-label` for form labels (readable on white)
- [x] Shared classes in `tdtd-frontend/src/lib/uiClasses.ts`

## Layout & shell

- [x] `AppShell`: top bar (brand, Recents, hamburger), `max-w-7xl` main region
- [x] `PageContainer` in `tdtd-frontend/src/layouts/PageContainer.tsx` (`standard` | `wide`)
- [x] All routed pages wrap root content in `PageContainer` (no ad-hoc root `max-w-*` wrappers)
- [x] Mobile nav drawer links left-aligned (`justify-start` on full-width `NavLink`s in `AppShell`; not centered)
- [x] Heavier pages use `lg:` multi-column grids (attendance, classes, subjects, scores)
- [x] Home is a today dashboard (greeting, due items, attendance CTA, missed-work summary, Student Lab shortcut) in `PageContainer` `standard` — see [Home-Page-Doc.md](../documentation/Home-Page-Doc.md)

## Buttons

- [x] Primary actions: `bg-primary` / `hover:bg-indigo-600`
- [x] Secondary actions: teal border/text (`secondaryButtonClass` / Home secondary link pattern)
- [x] Accent reserved for errors and high-emphasis warnings (not stats or status chips)

## Forms

- [x] Labels: `text-neutral-label` via `formLabelClass`
- [x] Standard inputs: neutral background, secondary focus ring
- [x] Inputs with validation/API error: primary border via `formInputClasses({ error: true })`
- [x] Error messages: `errorAlertClass` (`text-accent`, `role="alert"`)

## Pointer & disabled state

- [x] Global pointer feedback in `index.css` (pointer on interactive controls, `not-allowed` when disabled)
- [x] No custom `url(...)` cursor images

## File naming (Standard Rules)

- [x] Pages: `pages/<Name>/<Name>.tsx`
- [x] Components: `components/<Name>/<Name>.tsx`

## Accessibility

- [x] Focus-visible outlines on primary/secondary buttons and form controls (via shared classes)
- [x] Legible base typography (`font-sans`, inherited sizing on controls)

## Documentation sync

- [x] UI-Rules nav list includes Student Lab
- [x] Standard-Rules describes naming + pointer behavior (not image-based custom cursors)

## Verify after changes

```bash
cd tdtd-frontend && npm run lint && npm run build
```

After layout changes, confirm pages do not use root-level width wrappers outside `PageContainer` (modals and inline copy `max-w-*` are OK):

```bash
rg "max-w-(md|lg|2xl|4xl|7xl)" tdtd-frontend/src/pages --glob "*.tsx"
```
