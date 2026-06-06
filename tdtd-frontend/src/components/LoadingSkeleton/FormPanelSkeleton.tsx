import { SkeletonBar } from './SkeletonBar'
import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonStatus } from './SkeletonStatus'

type FormPanelSkeletonProps = {
  fields?: number
  className?: string
}

export function FormPanelSkeleton({
  fields = 4,
  className,
}: FormPanelSkeletonProps) {
  return (
    <SkeletonStatus
      label="Loading form"
      className={[
        'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SkeletonBar className="mb-4 h-4 w-36" />
      <div className="space-y-4">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2" aria-hidden>
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="mt-6 h-12 w-full rounded-2xl" />
    </SkeletonStatus>
  )
}
