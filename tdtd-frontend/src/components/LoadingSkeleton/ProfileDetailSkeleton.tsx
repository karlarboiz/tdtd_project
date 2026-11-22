import { SkeletonBar } from './SkeletonBar'
import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonStatus } from './SkeletonStatus'

type ProfileDetailSkeletonProps = {
  className?: string
}

export function ProfileDetailSkeleton({ className }: ProfileDetailSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading student profile"
      className={['space-y-6', className].filter(Boolean).join(' ')}
    >
      <div
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-hidden
      >
        <SkeletonBar className="mb-4 h-7 w-48 max-w-[80%]" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonBar className="h-3 w-full" />
          <SkeletonBar className="h-3 w-full" />
          <SkeletonBar className="h-3 w-full sm:col-span-2" />
        </div>
      </div>
      {[0, 1].map((section) => (
        <div
          key={section}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          aria-hidden
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SkeletonBar className="h-5 w-32" />
            <SkeletonBlock className="h-10 w-full max-w-[12rem] rounded-xl sm:w-40" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <SkeletonBlock key={n} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="mt-4 space-y-2 rounded-xl border border-slate-100 p-1">
            {[0, 1, 2].map((row) => (
              <SkeletonBlock key={row} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </SkeletonStatus>
  )
}
