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
 * ---- COLOUR PAIRS, NOT LOOSE COLOURS ----
 *
 * Each variant sets a text colour AND its matching surface, defined together
 * in src/index.css. Keeping them as pairs means you can't accidentally end up
 * with success-green text on a danger-red background — the combination simply
 * isn't expressible.
 *
 * Record<BadgeVariant, string> means adding a variant to the union above
 * without adding it here is a COMPILE error, not an unstyled badge found in
 * production.
 *
 * ---- WHY BADGES CARRY WORDS, NOT JUST COLOUR ----
 *
 * Roughly 1 in 12 men has some form of colour blindness, and red/green is the
 * common pair. A badge that says "Full" in red works for everyone; a bare red
 * dot works for most people. The skill calls this `color-not-only`, and it's
 * why none of these variants is used without a label.
 */
/**
 * ============================================================
 *  HOW MUCH LIME IS TOO MUCH LIME
 * ============================================================
 *
 * #d2ff00 is a very high-energy colour — relative luminance 0.85, which is
 * brighter than most whites people use on dark backgrounds. A little of it
 * draws the eye instantly. A lot of it is genuinely tiring to look at, and
 * worse, it stops meaning anything: if the date, the chip, the badge and the
 * button are all lime, none of them is emphasised.
 *
 * THE RULE THIS CODEBASE FOLLOWS:
 *
 *   SOLID lime  →  exactly one primary action per screen (Button variant
 *                  "primary"), and nothing else.
 *   TINTED lime →  bg-primary/10 with text-primary — active nav, selected
 *                  chips. Reads as "this one" without glare.
 *   NO lime     →  everything informational. Status uses the semantic
 *                  colours; ordinary metadata uses the text scale.
 *
 * So `primary` below is a TINT, not a fill. There is deliberately no solid
 * lime badge variant — if something needs that much emphasis it's an action,
 * and actions are Buttons.
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
