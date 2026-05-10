Standard Rules for Cursors

These are the standard rules that we follow when working on cursor-related issues.

Rule 1: Use Cursor Types Correctly
When using a custom cursor, make sure to define it in the correct location (usually src/cursor.scss or src/components/Cursor.js) and not override any existing cursors.
Always use the .cursor-primary class for standard cursors and .cursor-secondary for hover cursors.
Rule 2: Provide Visual Feedback
For mouse-over events, provide a visual feedback (e.g., change color or size) on the cursor to indicate that it's being hovered over.
If an element is disabled, display a cursor with a visual indication of disablement (e.g., red 'not allowed' icon).
Rule 3: Respect Cursor State
When switching between different states of an element (e.g., hover, focus, active), update the cursor accordingly to avoid any inconsistencies.
Ensure that the cursor state is reset when the element returns to its default state.
Rule 4: Avoid Customizing Standard Cursors
Do not customize or override standard cursors (e.g., url('cursor-pointer.png')) unless absolutely necessary and for a valid reason.
Instead, create custom cursors using the .cursor-primary or .cursor-secondary classes to maintain consistency.
Rule 5: Document Cursor Behavior
When introducing a new cursor behavior, document it thoroughly and provide examples where possible.
Make sure that all relevant stakeholders are aware of the cursor behavior changes.
Rule 6: Consistency Across Platforms
Ensure that cursor behavior is consistent across different platforms (e.g., desktop, mobile) to avoid confusion for users.
Test cursors on various devices and browsers to catch any inconsistencies.
Rules 7:
 [Front-End Component/Page] naming convention

All front-end components and pages should be written following this structure:

*   **Components:** `components/<Component Name>/<Component Name>.tsx`
*   **Pages:** `pages/<Page Name>/<Page Name>.tsx`

### Example Use Cases:
```markdown
# Components

*   Instead of: `import React from 'react'; function ClassForm(props) { // Component code here } export default ClassForm;`
  Use: `components/ClassForm/ClassForm.tsx`

*   Instead of: `import React from 'react'; function Home() { // Page code here } export default Home;`
  Use: `pages/Home/Home.tsx`
