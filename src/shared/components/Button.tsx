import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

/**
 * Tokens only, no raw colours.
 *
 * `primary` pairs bg-primary with text-on-primary and that pairing is load-
 * bearing: white on #d2ff00 measures 1.16:1, dark text on it 16.7:1. Anything
 * filled with the brand colour needs dark text on top.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-raised text-content hover:bg-hover border border-border',
  ghost: 'bg-transparent text-content-muted hover:bg-raised hover:text-content',
  danger: 'bg-danger-surface text-danger hover:bg-danger hover:text-canvas',
}

/**
 * Sizes exist for touch targets. The accessibility minimum is 44x44 (Apple) /
 * 48x48 (Material), and the inline `px-2 py-0.5` these replaced produced a 20px
 * control.
 *
 * min-h rather than a fixed height so a button with wrapping text can grow.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-meta',
  md: 'min-h-11 px-4 text-meta',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // transition-colors only: colour changes need no layout work, unlike
      // animating size or margin. Focus rings come from the global
      // :focus-visible in index.css so they cannot be forgotten per component.
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          {/* The label stays and a spinner is added, rather than swapping the
              text: replacing it changes the button's width mid-click and shifts
              everything beside it. */}
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
