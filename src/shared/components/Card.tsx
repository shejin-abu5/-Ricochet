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
 * A raised surface. Deliberately knows NOTHING about matches, teams or
 * players — that's what makes it reusable across every feature.
 *
 * Compare with MatchCard, which DOES understand our domain and therefore lives
 * in features/. That's the line between shared/ and features/.
 *
 * ---- HOW DEPTH WORKS IN A DARK THEME ----
 *
 * In a light theme you raise a surface with a drop shadow. On a near-black
 * background a shadow is invisible — there's nothing darker to cast onto. So
 * dark UIs separate planes by LIGHTNESS instead: the card is lighter than the
 * canvas, and a subtle border sharpens the edge.
 *
 * That's the whole reason the token scale is canvas → surface → raised →
 * hover rather than a set of shadow values.
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
