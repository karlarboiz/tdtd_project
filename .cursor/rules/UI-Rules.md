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
Use Primary (Indigo) for primary actions
Use Secondary (Teal) for secondary actions
Avoid using Accent (Coral) unless absolutely necessary
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
Use the `neutral-label` theme token for form labels (`text-neutral-label`). Reuse helpers in `tdtd-frontend/src/lib/uiClasses.ts` for inputs, buttons, and error text so pages stay consistent.

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

Compliance
Track implementation status in [UI-Compliance-Checklist.md](../documentation/UI-Compliance-Checklist.md).

By following these rules and design principles, we can create a consistent and user-friendly UI that enhances the overall application experience.

