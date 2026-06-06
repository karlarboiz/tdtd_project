import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type DueListSkeletonProps = {
  rows?: number
  className?: string
}

export function DueListSkeleton({ rows = 2, className }: DueListSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading due items"
      className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-hidden
        >
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-4 w-3/4 max-w-xs" />
            <SkeletonBar className="h-3 w-full max-w-sm" />
          </div>
          <div className="flex shrink-0 gap-2">
            <div className="tdtd-skeleton h-11 w-16 rounded-lg" />
            <div className="tdtd-skeleton h-11 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </SkeletonStatus>
  )
}
