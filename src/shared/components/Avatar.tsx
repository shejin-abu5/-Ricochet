/**
 * The initials-fallback avatar from the component inventory in
 * docs/03-uiux-design-brief.md. Used for team badges and player rows.
 *
 * No image support yet, on purpose — we picked colour + initials over a logo
 * upload for Phase 3a (see docs/08). When a real image URL arrives later, it
 * goes in HERE as an optional prop with these initials as the fallback, and
 * every call site gets it for free. That is the payoff for building a shared
 * component instead of five hand-rolled circles.
 */

import { colourClasses, type AvatarColour } from './avatarColours'

// A fixed palette rather than a free colour input — see ./avatarColours.ts
// for the palette itself, and why it isn't declared in this file.

type AvatarSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-label',
  md: 'h-10 w-10 text-meta',
  lg: 'h-14 w-14 text-base',
}

interface AvatarProps {
  /** Full name — "Kochi United" becomes "KU". */
  name: string
  colour?: AvatarColour
  size?: AvatarSize
  className?: string
}

/**
 * "Kochi United" → "KU". "Arjun" → "A".
 *
 * Outside the component so it isn't rebuilt on every render — same reasoning
 * as formatMatchDate in MatchCard.tsx.
 */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, colour = 'slate', size = 'sm', className = '' }: AvatarProps) {
  return (
    <span
      /**
       * aria-hidden because the initials are decorative — the full name is
       * always rendered next to this. Without it a screen reader announces
       * "KU, Kochi United" on every single row.
       *
       * `title` still gives sighted users a hover tooltip, which costs nothing.
       */
      aria-hidden="true"
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${sizeClasses[size]} ${colourClasses[colour]} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
