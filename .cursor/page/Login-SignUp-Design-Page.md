# Login & Signup pages — design documentation

Visual and layout specification for the public **Sign in** (`/login`) and **Create account** (`/signup`) routes. These pages sit **outside** [`AppShell`](../documentation/App-Shell-Function-Doc.md) and [`RequireAuth`](../../tdtd-frontend/src/components/RequireAuth/RequireAuth.tsx); they share one auth shell and the same design vocabulary as the rest of the app.

**Related:** [Authentication-Function.md](../documentation/Authentication-Function.md) (behavior & API) · [UI-Rules.md](../rules/UI-Rules.md) · [Content-Reveal-Function-Doc.md](../documentation/Content-Reveal-Function-Doc.md)

**Status:** Planned (AUTH-UI-001)

---

## Goals

| Goal | Detail |
|------|--------|
| **On-brand** | Use existing palette (indigo primary, teal secondary, cool-gray neutral) and Outfit font — no new dependencies or ad-hoc colors. |
| **Welcoming** | Logo, app name, and a short tagline so auth feels like part of TDTD, not a bare form dropped on white. |
| **Consistent** | Match card styling (`rounded-2xl`, white panels, `shadow-sm`/`shadow-lg`) and form helpers from [`uiClasses.ts`](../../tdtd-frontend/src/lib/uiClasses.ts). |
| **Focused** | Vertically centered card; narrow form column; clear primary CTA. |
| **Accessible** | Labels, `autoComplete`, focus rings, contrast, reduced-motion support. |

---

## Routes

| Route | Page component | When shown |
|-------|----------------|------------|
| `/login` | `Login.tsx` | Unauthenticated access to protected routes; after logout or inactivity timeout |
| `/signup` | `Signup.tsx` | User chooses “Create one” from login |

No routing changes in `App.tsx`. Layout is composed inside each page via shared `AuthLayout`.

---

## Layout overview

### Desktop (`lg:` and up, ≥1024px)

```text
┌──────────────────────────────────────────────────────────────────┐
│  viewport: min-h-svh, bg-neutral-bg, flex center, px-4 py-8      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  auth card: max-w-4xl, rounded-2xl, shadow-lg, overflow-hidden │
│  ├─────────────────────────┬──────────────────────────────────┤  │
│  │  Brand panel (~45%)     │  Form panel (~55%)               │  │
│  │  gradient bg            │  white bg, p-8                   │  │
│  │  AppBrand hero          │  h1 + subtitle                   │  │
│  │  app name               │  form fields                     │  │
│  │  tagline                │  error (if any)                  │  │
│  │  decorative blurs       │  primary button                  │  │
│  │                         │  footer cross-link               │  │
│  └─────────────────────────┴──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (&lt;1024px)

```text
┌─────────────────────────────┐
│  viewport (same bg/padding) │
│  ┌─────────────────────────┐│
│  │  single white card      ││
│  │  compact brand header   ││
│  │  (logo + app name)      ││
│  │  ─────────────────────  ││
│  │  h1 + subtitle          ││
│  │  form                   ││
│  │  error / CTA / link     ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

- Brand **side panel is hidden** on mobile; branding moves to a **compact header** inside the card.
- Card is full width within horizontal padding (`px-4`); internal padding `p-6`.

---

## Visual design

### Color & theme

All tokens from [`index.css`](../../tdtd-frontend/src/index.css) `@theme`:

| Token | Hex | Usage on auth pages |
|-------|-----|---------------------|
| `primary` | `#4F46E5` | Submit button, footer link accent, gradient start |
| `secondary` | `#14B8A6` | Input focus ring, gradient end, subtle brand accents |
| `accent` | `#FB7185` | Error text; optional error alert background (`bg-accent/10`) |
| `neutral-bg` | `#F1F5F9` | Page viewport background |
| `neutral-label` | `#64748B` | Form labels (`formLabelClass`) |

**Brand panel gradient (desktop):** `bg-gradient-to-br from-primary to-secondary` with white/semi-transparent text. Optional soft decorative elements: two absolutely positioned circles (`rounded-full`, `blur-3xl`, `opacity-20`) in white or `secondary/30` — CSS only, no image assets.

**Form panel:** `bg-white` with `text-slate-900` headings and `text-slate-600` muted body (`bodyMutedClass`).

### Typography

| Element | Classes | Size / weight |
|---------|---------|---------------|
| Page title (`h1`) | `text-2xl font-semibold text-slate-900` | Same as Home and other pages |
| Subtitle | `bodyMutedClass` (`text-sm text-slate-600`) | Page-specific helper line |
| Brand app name (panel) | `text-xl font-semibold text-white` (desktop panel) | — |
| Brand tagline (panel) | `text-sm text-white/80` | One line max |
| Form labels | `formLabelClass` | `text-sm font-medium text-neutral-label` |
| Footer cross-link | `bodyMutedClass` + link `font-semibold text-primary hover:underline` | — |

Font family: **Outfit** (global `font-sans`).

### Spacing & shape

| Area | Spec |
|------|------|
| Viewport padding | `px-4 py-8 sm:py-12` |
| Auth card max width | `max-w-4xl w-full` |
| Card radius / border | `rounded-2xl border border-slate-200` |
| Card shadow | `shadow-lg` |
| Form panel padding | `p-6` mobile; `p-8` desktop |
| Form field stack | `flex flex-col gap-4`; section below header `mt-8` |
| Label to input | `mt-1` on input |
| Footer cross-link | `mt-6` with `border-t border-slate-100 pt-6` above link row |
| Inputs | `rounded-xl`, full width — `formInputClasses()` |
| Primary button | `primaryButtonClass` + `px-4 py-3`, full width |

### Motion

- Wrap form body + footer in [`PageContentReveal`](../../tdtd-frontend/src/layouts/PageContentReveal.tsx) (200ms fade + 6px slide via `tdtd-content-enter`).
- Do **not** animate the full viewport or brand panel.
- Respect `prefers-reduced-motion: reduce` (animation disabled in `index.css`).

---

## Components

### `AuthLayout` (new)

**Path:** `tdtd-frontend/src/layouts/AuthLayout.tsx`

Shared shell for login and signup.

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | Form panel heading (e.g. “Sign in”, “Create account”) |
| `subtitle` | `string` | Muted helper under the heading |
| `children` | `ReactNode` | Form, error, button, and footer cross-link |

**Renders:**

1. Full-viewport wrapper (`min-h-svh`, `bg-neutral-bg`, centered flex).
2. Split card grid on `lg:` (`grid lg:grid-cols-[2fr_2.2fr]` or similar 45/55 split).
3. **Brand panel** (desktop only: `hidden lg:flex`): gradient, `AppBrand variant="hero"`, static app name and tagline.
4. **Form panel:** white column with mobile compact brand header, `title`, `subtitle`, then `children`.

**Static brand copy (both pages):**

- **App name:** Teacher's Dilemma Today
- **Tagline:** Attendance, classes, and scores — organized for your classroom.

### `AppBrand`

**Path:** `tdtd-frontend/src/components/AppBrand/AppBrand.tsx`

| Context | Variant / size |
|---------|----------------|
| Desktop brand panel | `variant="hero"` (`h-28` / `sm:h-32`) |
| Mobile compact header | `variant="header"` or optional `className` override (~`h-16 w-16`) |

Optional `className` prop on `AppBrand` for auth mobile header sizing without adding a new variant enum.

### Form primitives

Reuse from [`uiClasses.ts`](../../tdtd-frontend/src/lib/uiClasses.ts) — no custom input/button components:

- `formLabelClass`, `formInputClasses()`, `primaryButtonClass`, `bodyMutedClass`, `errorAlertClass`

### `PageContainer`

Auth pages do **not** wrap the root in `PageContainer` (the auth card controls width). Add an `auth` variant (`mx-auto w-full max-w-md`) to `PageContainer` for any inner narrow caps per [UI-Rules.md](../rules/UI-Rules.md).

---

## Page-specific content

### Login (`/login`)

| Element | Content / behavior |
|---------|-------------------|
| Title | Sign in |
| Subtitle | Welcome back — sign in to continue. |
| Fields | Email (`autoComplete="email"`), Password (`autoComplete="current-password"`) |
| Submit | “Sign in” / “Signing in…” while loading |
| Footer | No account? **Create one** → `/signup` |
| Redirect | If already authenticated → `Navigate` to `from` (default `/`) |
| Error | API message or “Login failed”; display with `errorAlertClass`, optionally in `rounded-xl bg-accent/10 px-3 py-2` |

### Signup (`/signup`)

| Element | Content / behavior |
|---------|-------------------|
| Title | Create account |
| Subtitle | Basic details to get started. You can update your profile later. |
| Fields | First name, Last name (`sm:grid-cols-2`), Email, Password (min 8) |
| Password hint | `text-xs text-slate-500` — At least 8 characters |
| Submit | “Create account” / “Creating account…” while loading |
| Footer | Already have an account? **Sign in** → `/login` |
| Redirect | If already authenticated → `/` |

**Auth logic unchanged** — see [Authentication-Function.md](../documentation/Authentication-Function.md).

---

## Error & loading states

| State | Design |
|-------|--------|
| Submitting | Primary button `disabled`, label switches to progressive verb (“Signing in…”) |
| Login/signup error | Coral text; optional light coral background box for emphasis |
| Auth bootstrap loading | No skeleton on auth pages; existing behavior (redirect only when `!authLoading && isAuthenticated`) |

---

## Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Labels | Every input has `htmlFor` / `id` pairing |
| Autocomplete | Standard values (`email`, `current-password`, `new-password`, `given-name`, `family-name`) |
| Focus | `focus:ring-2 ring-secondary` on inputs; `focus-visible:outline` on button |
| Contrast | White text on gradient panel; slate-900 on white form panel |
| Motion | `prefers-reduced-motion` disables enter animation |
| Touch | Button `min` comfortable height via `py-3`; full-width CTA on mobile |

---

## Out of scope (v1)

- Forgot password link
- OAuth / social sign-in
- HttpOnly cookie UI changes
- Separate auth route layout in `App.tsx` (layout lives inside page components)
- Loading skeletons during auth bootstrap

---

## Implementation map

| File | Action |
|------|--------|
| `src/layouts/AuthLayout.tsx` | **Create** — shared split-panel shell |
| `src/pages/Login/Login.tsx` | Refactor to use `AuthLayout` + `PageContentReveal` |
| `src/pages/Signup/Signup.tsx` | Same shell as login |
| `src/layouts/PageContainer.tsx` | Add `auth` variant |
| `src/components/AppBrand/AppBrand.tsx` | Optional `className` prop |
| `src/index.css` | Optional `.tdtd-auth-brand` utility only if Tailwind inline gradient is insufficient |

---

## Verification checklist

- [ ] `/login` and `/signup` centered on viewport with `neutral-bg` background
- [ ] Desktop: gradient brand panel + white form panel; mobile: single card with compact logo header
- [ ] Logo visible on both breakpoints
- [ ] Form fields, button, and links match `uiClasses` styling
- [ ] Invalid login shows error inside card
- [ ] Cross-links between login and signup work
- [ ] Authenticated user visiting `/login` redirects correctly
- [ ] Enter animation plays; disabled when `prefers-reduced-motion: reduce`
