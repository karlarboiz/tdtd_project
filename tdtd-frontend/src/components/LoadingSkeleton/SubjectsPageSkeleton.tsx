import { FormPanelSkeleton } from './FormPanelSkeleton'
import { TableSkeleton } from './TableSkeleton'
import { SkeletonStatus } from './SkeletonStatus'

type SubjectsPageSkeletonProps = {
  className?: string
}

export function SubjectsPageSkeleton({ className }: SubjectsPageSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading subjects"
      className={['space-y-8', className].filter(Boolean).join(' ')}
    >
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <FormPanelSkeleton fields={1} />
        </div>
        <div className="lg:col-span-8">
          <FormPanelSkeleton fields={1} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="tdtd-skeleton h-4 w-48 rounded-lg" aria-hidden />
        </div>
        <TableSkeleton rows={4} />
      </div>
    </SkeletonStatus>
  )
}
