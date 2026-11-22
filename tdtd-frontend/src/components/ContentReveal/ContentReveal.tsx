import type { ReactNode } from 'react'
import { contentRevealClass } from '@/lib/uiClasses'

export type ContentRevealProps = {
  /** Remount and replay enter animation when identity changes. */
  revealKey?: string | number
  className?: string
  children: ReactNode
}

export function ContentReveal({
  revealKey,
  className,
  children,
}: ContentRevealProps) {
  return (
    <div
      key={revealKey}
      className={[contentRevealClass, className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
