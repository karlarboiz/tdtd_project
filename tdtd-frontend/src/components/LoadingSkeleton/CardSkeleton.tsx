import { SkeletonBar } from './SkeletonBar'
import { SkeletonBlock } from './SkeletonBlock'
import { SkeletonStatus } from './SkeletonStatus'

type CardSkeletonProps = {
  variant?: 'default' | 'amber' | 'button'
  className?: string
}

export function CardSkeleton({
  variant = 'default',
  className,
}: CardSkeletonProps) {
  if (variant === 'button') {
    return (
      <SkeletonStatus label="Loading" className={className}>
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
      </SkeletonStatus>
    )
  }

  const shellClass =
    variant === 'amber'
      ? 'rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-5 shadow-sm'
      : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

  return (
    <SkeletonStatus
      label="Loading"
      className={[shellClass, className].filter(Boolean).join(' ')}
    >
      <SkeletonBar className="mb-3 h-4 w-32" />
      <SkeletonBar className="mb-4 h-3 w-full max-w-sm" />
      <SkeletonBar className="h-3 w-28" />
    </SkeletonStatus>
  )
}
