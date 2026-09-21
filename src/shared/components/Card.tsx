import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  /** Extra Tailwind classes from the parent, appended to the defaults below. */
  className?: string
  /**
   * Cards that are themselves links get a hover state. Plain content cards
   * shouldn't — a hover effect on something unclickable is a false affordance
   * that makes people click and feel like the app is broken.
   */
  interactive?: boolean
}

/**
 * A raised surface. Knows nothing about the domain, which is what keeps it in
 * shared/ while MatchCard lives in features/.
 *
 * Depth comes from lightness, not shadow: on a near-black canvas there is
 * nothing darker to cast onto, which is why the token scale runs canvas →
 * surface → raised → hover rather than a set of shadow values.
 */
export function Card({ children, className = '', interactive = false }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-4 ${
        interactive ? 'transition-colors hover:border-border-strong hover:bg-raised' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
