import { skeletonClass } from '@/lib/uiClasses'

type SkeletonBarProps = {
  className?: string
}

export function SkeletonBar({ className }: SkeletonBarProps) {
  return (
    <div
      className={[skeletonClass, 'h-3', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
