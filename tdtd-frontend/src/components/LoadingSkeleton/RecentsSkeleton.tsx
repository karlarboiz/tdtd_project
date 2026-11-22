import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type RecentsSkeletonProps = {
  className?: string
}

export function RecentsSkeleton({ className }: RecentsSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading activity"
      className={['space-y-6', className].filter(Boolean).join(' ')}
    >
      {[0, 1].map((section) => (
        <div
          key={section}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          aria-hidden
        >
          <div className="border-b border-slate-100 px-5 py-3">
            <SkeletonBar className="h-4 w-28" />
          </div>
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((row) => (
              <li key={row} className="space-y-2 px-5 py-4">
                <SkeletonBar className="h-4 w-full max-w-md" />
                <SkeletonBar className="h-3 w-24" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </SkeletonStatus>
  )
}
