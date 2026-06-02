import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'

type PageContentRevealProps = {
  /** Override default pathname-based key (e.g. same route, different query). */
  revealKey?: string | number
  className?: string
  children: ReactNode
}

export function PageContentReveal({
  revealKey,
  className,
  children,
}: PageContentRevealProps) {
  const { pathname } = useLocation()
  return (
    <ContentReveal
      revealKey={revealKey ?? pathname}
      className={className}
    >
      {children}
    </ContentReveal>
  )
}
