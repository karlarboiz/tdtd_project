import { useId } from 'react'
import { primaryButtonClass } from '@/lib/uiClasses'

type InactivityWarningModalProps = {
  open: boolean
  secondsRemaining: number
  onStaySignedIn: () => void
}

export function InactivityWarningModal({
  open,
  secondsRemaining,
  onStaySignedIn,
}: InactivityWarningModalProps) {
  const titleId = useId()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90svh,640px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-2xl sm:pb-5"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Session expiring
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You will be signed out in{' '}
          <span className="font-semibold text-slate-900">
            {secondsRemaining}
          </span>{' '}
          {secondsRemaining === 1 ? 'second' : 'seconds'} due to inactivity.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStaySignedIn}
            className={`min-h-11 px-4 py-2.5 text-sm ${primaryButtonClass}`}
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
