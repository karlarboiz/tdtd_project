import { FormPanelSkeleton } from './FormPanelSkeleton'
import { ListRowsSkeleton } from './ListRowsSkeleton'
import { SkeletonBar } from './SkeletonBar'
import { SkeletonStatus } from './SkeletonStatus'

type ScoresPageSkeletonProps = {
  className?: string
}

export function ScoresPageSkeleton({ className }: ScoresPageSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading scores"
      className={[
        'flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="lg:col-span-5">
        <FormPanelSkeleton fields={5} />
      </div>
      <div
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7"
        aria-hidden
      >
        <SkeletonBar className="mb-2 h-5 w-48" />
        <SkeletonBar className="mb-4 h-3 w-64" />
        <ListRowsSkeleton rows={4} showAction={false} className="border-0" />
      </div>
    </SkeletonStatus>
  )
}
