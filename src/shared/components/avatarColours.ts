/**
 * The Avatar palette, split out of Avatar.tsx so that file only exports
 * components.
 *
 * Fast Refresh swaps component functions in place and preserves state, which it
 * can only do when a file exports nothing else — a runtime export alongside a
 * component forces a full reload on every save. A type-only export would have
 * been fine; the `avatarColours` array is what forces the split.
 */

export type AvatarColour = 'lime' | 'emerald' | 'sky' | 'violet' | 'amber' | 'slate'

/**
 * Written out in full because Tailwind scans for complete class names at build
 * time — an interpolated `bg--500/15` produces no CSS at all.
 *
 * Tinted backgrounds with bright text rather than solid fills: a solid block on
 * a dark canvas competes with the brand lime for attention. 'lime' uses the
 * brand primary so a team can carry the app's accent.
 */
const colourClasses: Record<AvatarColour, string> = {
  lime: 'bg-primary/15 text-primary',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  sky: 'bg-sky-500/15 text-sky-300',
  violet: 'bg-violet-500/15 text-violet-300',
  amber: 'bg-amber-500/15 text-amber-300',
  slate: 'bg-raised text-content-muted',
}

export { colourClasses }

/** Every colour in the palette, for the pickers in the team forms. */
export const avatarColours = Object.keys(colourClasses) as AvatarColour[]
