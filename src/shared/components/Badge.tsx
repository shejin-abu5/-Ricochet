import type { ReactNode } from 'react'

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  /**
   * The uppercase category tag from the reference — PICKUP, TEAM MATCH,
   * TOURNAMENT. Visually distinct from a status pill so the two never read as
   * the same kind of information.
   */
  tag?: boolean
}

/**
 * Small status pill — "Open", "Full", "5v5", "Squad full".
 *
 * Each variant pairs a text colour with its matching surface, defined together
 * in index.css, so success-green text on a danger-red background is not
 * expressible. Keyed by the union, so adding a variant without styling it is a
 * compile error rather than an unstyled badge in production.
 *
 * Badges always carry words, never colour alone — red/green is the common
 * colour-blindness pair, and "Full" in red works for everyone.
 *
 * `primary` is a TINT and there is deliberately no solid lime variant. #d2ff00
 * has a relative luminance of 0.85; used on everything it stops meaning
 * anything. Solid lime is reserved for the one primary action per screen, which
 * is a Button.
 */
const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-raised text-content-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-surface text-success',
  info: 'bg-info-surface text-info',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
}

export function Badge({ children, variant = 'neutral', tag = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${
        tag
          ? // Tags: squarer, uppercase, tighter — reads as a category label.
            'rounded-sm px-1.5 py-0.5 text-label uppercase'
          : // Status pills: rounded, sentence case.
            'rounded-pill px-2.5 py-1 text-label'
      } ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
