const LOGO_SRC = '/tdtd-logo.png'
const LOGO_ALT = "Teacher's Dilemma Today"

type AppBrandProps = {
  variant?: 'header' | 'hero'
  className?: string
}

export function AppBrand({ variant = 'header', className }: AppBrandProps) {
  const isHero = variant === 'hero'
  const defaultClassName = isHero
    ? 'h-28 w-28 shrink-0 rounded-2xl object-contain sm:h-32 sm:w-32'
    : 'h-10 w-10 shrink-0 rounded-lg object-contain sm:h-11 sm:w-11'

  return (
    <div className={isHero ? 'flex justify-center' : undefined}>
      <img
        src={LOGO_SRC}
        alt={LOGO_ALT}
        className={className ?? defaultClassName}
      />
    </div>
  )
}
