import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type TableSkeletonProps = {
  rows?: number
  className?: string
}

export function TableSkeleton({ rows = 4, className }: TableSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading table"
      className={className}
    >
      <ul className="divide-y divide-slate-100 sm:hidden" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="space-y-2 px-4 py-4">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-3 w-28" />
            <div className="tdtd-skeleton mt-2 h-11 w-full rounded-lg" />
          </li>
        ))}
      </ul>
      <div className="hidden space-y-0 sm:block" aria-hidden>
        <div className="flex gap-4 border-b border-slate-100 bg-neutral-bg/80 px-5 py-3">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-3 w-20" />
          <SkeletonBar className="h-3 w-16" />
          <SkeletonBar className="ml-auto h-3 w-14" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-100 px-5 py-3"
          >
            <SkeletonBar className="h-4 w-36" />
            <SkeletonBar className="h-3 w-16" />
            <SkeletonBar className="h-3 w-12" />
            <div className="tdtd-skeleton ml-auto h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </SkeletonStatus>
  )
}
