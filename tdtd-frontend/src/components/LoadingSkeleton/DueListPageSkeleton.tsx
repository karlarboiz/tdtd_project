import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type DueListPageSkeletonProps = {
  className?: string
}

export function DueListPageSkeleton({ className }: DueListPageSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading missed attendance"
      className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}
    >
      {[0, 1].map((group) => (
        <div key={group} aria-hidden>
          <SkeletonBar className="mb-3 h-3 w-40" />
          <div className="flex flex-col gap-3">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="tdtd-skeleton h-4 w-3/4 max-w-xs rounded-lg" />
                  <div className="tdtd-skeleton h-3 w-full max-w-sm rounded-lg" />
                </div>
                <div className="tdtd-skeleton h-11 w-36 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonStatus>
  )
}
