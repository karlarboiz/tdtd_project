import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type ListRowsSkeletonProps = {
  rows?: number
  showAction?: boolean
  className?: string
}

export function ListRowsSkeleton({
  rows = 5,
  showAction = true,
  className,
}: ListRowsSkeletonProps) {
  return (
    <SkeletonStatus
      className={['divide-y divide-slate-100 rounded-xl border border-slate-100', className]
        .filter(Boolean)
        .join(' ')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 px-3 py-3"
          aria-hidden
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkeletonBar className="h-4 w-32 max-w-[60%]" />
            <SkeletonBar className="h-3 w-24 max-w-[40%]" />
          </div>
          {showAction ? (
            <div className="tdtd-skeleton h-4 w-4 shrink-0 rounded" />
          ) : null}
        </div>
      ))}
    </SkeletonStatus>
  )
}
