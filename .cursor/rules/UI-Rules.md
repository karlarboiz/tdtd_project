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

Layout (desktop)
The app uses a shared shell (`AppShell` in `tdtd-frontend`) with a persistent **top** navigation bar (primary routes). Individual screens may still use inline back links where helpful. Page content lives in the shell main region, capped at a comfortable reading width (`max-w-7xl` with horizontal padding), not a phone-width root. Heavier pages use `lg:` two-column grids (e.g. attendance session, classes); mobile remains a single column unless a specific breakpoint is documented otherwise.

By following these rules and design principles, we can create a consistent and user-friendly UI that enhances the overall application experience.

