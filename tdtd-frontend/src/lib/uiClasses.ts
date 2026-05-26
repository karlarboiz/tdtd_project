/** Shared Tailwind class strings aligned with .cursor/rules/UI-Rules.md */

export const formLabelClass =
  'block text-sm font-medium text-neutral-label'

export const formLabelInlineClass = 'text-sm font-medium text-neutral-label'

export const bodyMutedClass = 'text-sm text-slate-600'

export const formInputBaseClass =
  'w-full rounded-xl bg-neutral-bg px-3 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:opacity-50'

export const formInputStandardClass =
  `${formInputBaseClass} border border-slate-200 ring-secondary focus:ring-2`

export const formInputErrorRingClass =
  'border-2 border-primary ring-primary focus:ring-2'

export function formInputClasses(options?: {
  error?: boolean
  className?: string
}): string {
  const parts = [
    formInputBaseClass,
    options?.error ? formInputErrorRingClass : 'border border-slate-200 ring-secondary focus:ring-2',
    options?.className,
  ].filter(Boolean)
  return parts.join(' ')
}

export const primaryButtonClass =
  'rounded-xl bg-primary font-semibold text-white shadow-md transition hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryButtonClass =
  'rounded-xl border-2 border-secondary bg-white font-semibold text-secondary shadow-sm transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50'

export const secondaryLinkTileClass =
  'rounded-2xl border-2 border-secondary bg-white px-5 py-4 text-center text-lg font-semibold text-secondary shadow-sm transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary'

export const errorAlertClass = 'text-sm font-medium text-accent'
