# Standard rules (TDTD frontend)

Project-wide conventions for `tdtd-frontend`. UI palette and layout live in [UI-Rules.md](./UI-Rules.md).

## Pointer & interactive feedback

Use the **browser’s standard cursors**, not custom image cursors (`url(...)`).

- **Interactive** links, buttons, and enabled controls: `cursor: pointer` (set globally in `tdtd-frontend/src/index.css`).
- **Disabled** controls: `cursor: not-allowed` plus reduced opacity or `disabled:` styles.
- **Hover / focus**: pair pointer feedback with visible hover or focus styles (color, ring, background)—do not rely on the cursor alone.
- **State**: when an element leaves hover, focus, or active, reset styles to the default variant.

Document new interaction patterns in `.cursor/documentation/` when behavior is non-obvious.

## Front-end file naming

All front-end components and pages use this structure:

- **Components:** `components/<Component Name>/<Component Name>.tsx`
- **Pages:** `pages/<Page Name>/<Page Name>.tsx`

### Examples

```text
components/ClassForm/ClassForm.tsx
pages/Home/Home.tsx
```

Router entry (`App.tsx`), bootstrap (`main.tsx`), layouts (`layouts/`), and shared libs (`lib/`, `api/`) are exempt from the folder-per-name rule.

## Compliance checklist

See [UI-Compliance-Checklist.md](../documentation/UI-Compliance-Checklist.md).
