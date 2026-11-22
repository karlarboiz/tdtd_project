import { skeletonClass } from '@/lib/uiClasses'

type SkeletonBlockProps = {
  className?: string
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={[skeletonClass, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
