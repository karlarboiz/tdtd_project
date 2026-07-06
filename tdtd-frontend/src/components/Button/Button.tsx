import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import {
  ghostButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
  secondaryLinkTileClass,
} from '@/lib/uiClasses'

export type ButtonVariant = 'primary' | 'secondary' | 'tile' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonClassOptions = {
  variant: ButtonVariant
  size: ButtonSize
  fullWidth: boolean
  asLink: boolean
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: primaryButtonClass,
  secondary: secondaryButtonClass,
  tile: secondaryLinkTileClass,
  ghost: ghostButtonClass,
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm',
  md: 'px-4 py-3',
  lg: 'rounded-2xl px-5 py-4 text-lg',
}

function buttonClassName({
  variant,
  size,
  fullWidth,
  asLink,
  className,
}: ButtonClassOptions): string {
  const sizeClass = variant === 'tile' || variant === 'ghost' ? '' : sizeClasses[size]

  const layoutClass = (() => {
    if (variant === 'ghost') return ''
    if (asLink) {
      if (variant === 'tile' || fullWidth) {
        return 'block text-center'
      }
      return 'inline-flex items-center justify-center'
    }
    if (variant === 'secondary' || variant === 'primary') {
      return 'inline-flex items-center justify-center'
    }
    return ''
  })()

  return [
    variantClasses[variant],
    sizeClass,
    layoutClass,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

type ButtonOwnProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
  children: ReactNode
}

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    to?: undefined
  }

type ButtonAsLinkProps = ButtonOwnProps &
  Omit<LinkProps, keyof ButtonOwnProps | 'to'> & {
    to: string
  }

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className,
    children,
    to,
    type = 'button',
    ...rest
  },
  ref,
) {
  const computedClassName = buttonClassName({
    variant,
    size,
    fullWidth,
    asLink: Boolean(to),
    className,
  })

  if (to) {
    const { disabled: _disabled, type: _type, ...linkRest } = rest as ButtonAsLinkProps
    return (
      <Link to={to} className={computedClassName} {...linkRest}>
        {children}
      </Link>
    )
  }

  const buttonRest = rest as ButtonAsButtonProps

  return (
    <button
      ref={ref}
      type={type}
      className={computedClassName}
      {...buttonRest}
    >
      {children}
    </button>
  )
})
