import type { ReactNode } from 'react'

type SkeletonStatusProps = {
  label?: string
  className?: string
  children: ReactNode
}

export function SkeletonStatus({
  label = 'Loading…',
  className,
  children,
}: SkeletonStatusProps) {
  return (
    <div
      className={className}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
        {label}
      </span>
      {children}
    </div>
  )
}
