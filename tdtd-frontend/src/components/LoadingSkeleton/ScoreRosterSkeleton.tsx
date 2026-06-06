import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type ScoreRosterSkeletonProps = {
  rows?: number
  withCheckbox?: boolean
  className?: string
}

export function ScoreRosterSkeleton({
  rows = 6,
  withCheckbox = true,
  className,
}: ScoreRosterSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading roster"
      className={['divide-y divide-slate-100', className].filter(Boolean).join(' ')}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 py-3"
          aria-hidden
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {withCheckbox ? (
              <div className="tdtd-skeleton h-5 w-5 shrink-0 rounded" />
            ) : null}
            <SkeletonBar className="h-4 w-36 max-w-[70%]" />
          </div>
          <div className="tdtd-skeleton h-10 w-full max-w-[6rem] rounded-xl sm:w-24" />
        </div>
      ))}
    </SkeletonStatus>
  )
}
