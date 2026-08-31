import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

/**
 * Every value here is a design token — no raw colours. Change the tokens in
 * src/index.css and every button in the app follows.
 *
 * NOTE ON `primary`: it pairs `bg-primary` with `text-on-primary`, and that
 * pairing is not cosmetic. #d2ff00 is bright enough that white text on it is
 * 1.16:1 — genuinely unreadable. Dark text on it is 16.7:1. Any time you fill
 * something with the brand colour, the text on top has to be dark.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-raised text-content hover:bg-hover border border-border',
  ghost: 'bg-transparent text-content-muted hover:bg-raised hover:text-content',
  danger: 'bg-danger-surface text-danger hover:bg-danger hover:text-canvas',
}

/**
 * ---- SIZES EXIST BECAUSE OF TOUCH TARGETS ----
 *
 * Before this pass, small buttons were written inline as `px-2 py-0.5 text-label`,
 * which produced a control about 20px tall. The accessibility minimum for
 * anything you tap is 44×44 (Apple) / 48×48 (Material) — a 20px target is a
 * genuine usability failure on a phone, not a style choice.
 *
 * `min-h` rather than fixed height so a button with wrapping text can grow.
 * `sm` is 36px visually but keeps a 44px tap area via padding on touch
 * devices; on a dense list of actions that's the honest compromise.
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
      /**
       * `transition-colors` and nothing else: colour changes are cheap for the
       * browser (no layout, no paint of surrounding elements). Animating
       * width/height or margins on hover causes reflow and jank — the skill's
       * `transform-performance` rule.
       *
       * Focus rings come from the global :focus-visible in index.css, so they
       * can't be forgotten per-component.
       */
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      /**
       * aria-busy tells a screen reader the control is working. Without it, a
       * blind user hears the label change from "Join match" to "Loading…" with
       * no indication that anything is in progress.
       */
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          {/* A spinner, not the word "Loading…". Swapping the label out means
              the button changes width mid-click, which shifts everything next
              to it. Keeping the label and adding a spinner holds the layout
              still — the skill's `layout-shift-avoid` rule. */}
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
