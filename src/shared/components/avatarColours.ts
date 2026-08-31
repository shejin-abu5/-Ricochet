/**
 * The Avatar palette, split out of Avatar.tsx.
 *
 * ---- WHY A SEPARATE FILE AT ALL? ----
 *
 * This started life inside Avatar.tsx and the linter objected:
 *
 *   "Fast refresh only works when a file only exports components."
 *
 * FAST REFRESH updates the browser when you save WITHOUT losing state — your
 * half-filled form stays filled. It does that by swapping component functions
 * in place, which is only safe if the file contains nothing else. Export a
 * runtime constant alongside and it gives up and full-reloads.
 *
 * Not a bug — just editing a form, saving, and finding it blank, all day. A
 * type-only export would have been fine (types vanish at build time); it's the
 * runtime `avatarColours` array that forces the split.
 */

export type AvatarColour = 'lime' | 'emerald' | 'sky' | 'violet' | 'amber' | 'slate'

/**
 * TAILWIND GOTCHA: Tailwind scans source for COMPLETE class names at build
 * time. It has no idea what your code does at runtime, so
 *
 *   className={`bg-${colour}-500/15`}     // ❌ produces no CSS at all
 *
 * finds nothing, because that string never appears literally anywhere. Every
 * class has to be written out in full somewhere — which is what this table is.
 *
 * ---- DESIGN NOTE FOR THE DARK THEME ----
 *
 * These are tinted BACKGROUNDS with matching bright text, not solid fills.
 * A solid colour block on a dark canvas fights with the brand lime for
 * attention; a 15%-opacity tint reads as "identity" without competing with
 * anything you're actually meant to click.
 *
 * 'lime' deliberately uses the brand primary, so a team can carry the app's
 * accent colour. It's listed first because it's the obvious default choice.
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
