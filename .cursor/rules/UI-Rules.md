UI Rules

These are the standard rules for designing and implementing a consistent user interface across our application.

Color Palette
We will use the following colors in our application, each applied to their designated areas:

Primary: Indigo — #4F46E5
Used for: Calls-to-action, buttons, and other interactive elements
Secondary: Teal — #14B8A6
Used for: Backgrounds, hover effects, and subtle design accents
Accent: Coral — #FB7185
Used for: High-emphasis design elements, such as error messages or warnings
Neutral: Cool Gray — #F1F5F9
Used for: Backgrounds, textures, and subtle design elements
General Design Principles
We will follow these general design principles:

Consistency: All UI elements should have a consistent look and feel across the application.
Clarity: All design elements should be clear and easy to understand at a glance.
Legibility: All text should be legible, with sufficient line height and font size for readability.
Component-Specific Design Guidelines
Each component has specific design guidelines that must be followed:

Buttons:
Use the shared `<Button>` component (`tdtd-frontend/src/components/Button/Button.tsx`) for all standard actions, form submits, and router-link CTAs. Do not hand-roll `primaryButtonClass` / `secondaryButtonClass` on raw `<button>` or `<Link>` elements unless documented below.

Color roles:
- **Primary (Indigo)** — main action (`variant="primary"`)
- **Secondary (Teal)** — cancel, alternate, or lower-emphasis action (`variant="secondary"`)
- **Accent (Coral)** — not for buttons; reserved for errors and high-emphasis warnings

### `<Button>` API

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `variant` | `'primary' \| 'secondary' \| 'tile' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding and typography |
| `fullWidth` | `boolean` | `false` | Full-width form submits (`w-full`) |
| `to` | `string` | — | Renders `Link` instead of `<button>` |
| `className` | `string` | — | Layout only (`mt-4`, `shrink-0`, etc.) |
| `type` | `'button' \| 'submit'` | `'button'` | Native button type (ignored when `to` is set) |

Variant guide:
- **`primary`** — Save, Submit, Activate, and other main CTAs
- **`secondary`** — Cancel, Reset, Download sample, and alternate actions
- **`tile`** — Large secondary navigation tile (e.g. Home attendance calendar link)
- **`ghost`** — Icon and toolbar controls (hamburger, close) with no fill or border

Size guide:
- **`sm`** — Compact rows, modals, table action columns
- **`md`** — Default for forms and dialogs
- **`lg`** — Prominent page CTAs (score save, attendance submit)

Examples:

```tsx
import { Button } from '@/components/Button/Button'

<Button type="submit" fullWidth>Sign in</Button>
<Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
<Button to="/attendance" variant="tile">View attendance calendar</Button>
<Button variant="ghost" aria-label="Open menu">{icon}</Button>
```

Do **not** use `<Button>` for:
- Segmented / toggle groups (e.g. AM/PM picker, date-range tabs)
- Selection cards with rich multi-line content (e.g. report form picker)
- Modal backdrop hit-targets (full-screen transparent overlay)
- Contextual colored chips (e.g. due-list amber actions)
- File-input `file:` pseudo styling

For those patterns, use purpose-built markup and document non-obvious behavior in `.cursor/documentation/`.
Backgrounds and Textures:
Use Neutral (Cool Gray) as the default background color
Use Primary (Indigo) or Secondary (Teal) for backgrounds that require attention
Form Inputs and Labels:
Use Primary (Indigo) for form inputs with an error message
Use Secondary (Teal) for standard form inputs
Use Neutral (Cool Gray) for form labels
Accessibility Guidelines
We will follow these accessibility guidelines:

Color Contrast: Ensure sufficient color contrast between UI elements and their backgrounds.
Font Size and Line Height: Ensure all text is legible, with sufficient line height and font size.

Form labels and shared classes
Use the `neutral-label` theme token for form labels (`text-neutral-label`). Use `<Button>` for actions. Reuse helpers in `tdtd-frontend/src/lib/uiClasses.ts` for inputs, labels, and error text so pages stay consistent.

Layout (desktop)
The app uses a shared shell (`AppShell` in `tdtd-frontend`) with a persistent **top** bar: logo (`AppBrand`), **Recents** link, and a hamburger that toggles primary routes (Home, Attendance, Classes & students, Subjects, Scores, Student Lab). See [App-Shell-Function-Doc.md](../documentation/App-Shell-Function-Doc.md). Individual screens may still use inline back links where helpful. Page content lives in the shell main region, capped at a comfortable reading width (`max-w-7xl` with horizontal padding), not a phone-width root. Heavier pages use `lg:` two-column grids (e.g. attendance session, classes); mobile remains a single column unless a specific breakpoint is documented otherwise.

Page content (`PageContainer`)
Every routed page wraps its root content in `PageContainer` from `tdtd-frontend/src/layouts/PageContainer.tsx`. Layout is two layers:

1. **`AppShell`** — navigation, `max-w-7xl`, and horizontal padding (the only place for shell-level `mx-auto` / `px-4` / `max-w-7xl`).
2. **`PageContainer`** — content width inside the shell.

Do not add page-level `max-w-7xl`, duplicate shell padding, or ad-hoc root wrappers such as `mx-auto max-w-md`, `max-w-lg`, or `max-w-2xl` on the page root. Use a `PageContainer` variant instead; if neither variant fits, extend `PageContainer` rather than inlining Tailwind width classes on the page.

| Variant | Classes | Use when |
|---------|---------|----------|
| `standard` (default) | `max-w-2xl lg:max-w-4xl` | Focused flows: home, due list, recents, attendance calendar, score grading |
| `wide` | `w-full` | Multi-column layouts and tables: classes, subjects, scores, attendance session, student lab |

Example: `<PageContainer>` or `<PageContainer variant="wide" className="space-y-6">`. Inline `max-w-*` on description text or modals is allowed; it must not replace `PageContainer` for page width.

Motion
Use the shared content-reveal pattern for list/detail panels and routed page bodies inside `PageContainer`. Do not animate `AppShell`, `<Outlet />`, or the full viewport. See [Content-Reveal-Function-Doc.md](../documentation/Content-Reveal-Function-Doc.md).

Loading
While fetching backend data, show skeleton placeholders from `LoadingSkeleton` components—not plain “Loading…” text or empty space. After data arrives, use content reveal. Silent refresh must not swap the whole list for a skeleton. See [Loading-Skeleton-Function-Doc.md](../documentation/Loading-Skeleton-Function-Doc.md).

Web vs mobile capability

| Capability | Web (`VITE_APP_TARGET=web`) | Mobile app (`VITE_APP_TARGET=mobile`) |
|------------|----------------------------|----------------------------------------|
| Data | REST → `tdtd-node` only | Local SQLite first; sync when online |
| Offline writes | No | Yes (outbox + sync) |
| Attendance reminders | In-app banners | Local notifications (Capacitor) when enabled |
| Install | Browser URL | App Store / Play / sideload |

Detect target via `isMobileApp()` / `isOfflineCapable()` in `tdtd-frontend/src/mobile/appTarget.ts`. Web UI may show “Install the mobile app for offline use” on Home or settings when online-only.

Compliance
Track implementation status in [UI-Compliance-Checklist.md](../documentation/UI-Compliance-Checklist.md).

By following these rules and design principles, we can create a consistent and user-friendly UI that enhances the overall application experience.

