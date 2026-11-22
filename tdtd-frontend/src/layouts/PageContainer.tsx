import type { ReactNode } from 'react'

export type PageContainerVariant = 'standard' | 'wide' | 'auth'

const variantClass: Record<PageContainerVariant, string> = {
  standard: 'mx-auto w-full max-w-2xl lg:max-w-4xl',
  wide: 'w-full',
  auth: 'mx-auto w-full max-w-md',
}

type PageContainerProps = {
  variant?: PageContainerVariant
  className?: string
  children: ReactNode
}

export function PageContainer({
  variant = 'standard',
  className,
  children,
}: PageContainerProps) {
  return (
    <div
      className={[variantClass[variant], className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
