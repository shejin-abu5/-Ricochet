interface SlotDotsProps {
  /** How many slots are taken. */
  filled: number
  /** How many slots exist in total. */
  total: number
}

/**
 * One dot per slot, filled for each player who has joined.
 *
 * ---- WHY DOTS INSTEAD OF A PROGRESS BAR ----
 *
 * A bar shows a PROPORTION. Dots show a COUNT — and the count is what matters
 * here. "Two spots left" is a decision you can act on; "80% full" is trivia
 * you then have to do arithmetic on.
 *
 * ---- WHY THIS IS ITS OWN FILE NOW ----
 *
 * It started life inside MatchCard.tsx, which was right while the card was the
 * only thing drawing it. The detail page's capacity readout wants it too, and
 * the moment a second component needs a piece of UI, copy-pasting it means two
 * versions that drift apart the first time one gets tweaked.
 *
 * Note where it landed: features/matches/components/, NOT shared/. Both callers
 * live inside the matches feature, and CLAUDE.md reserves shared/ for code that
 * genuinely crosses features. "Two components use it" is the trigger to extract
 * a file; it is not by itself the trigger to promote it to shared/.
 */
export function SlotDots({ filled, total }: SlotDotsProps) {
  // Capped so an 11v11 (22 slots) doesn't produce a row of dots too small to
  // see — or, on the detail page, one too wide for an 18rem sidebar. Past the
  // cap the "7 / 10" label beside it carries the information, which is why that
  // label is ALWAYS rendered and never replaced by these dots.
  if (total > 12) return null

  return (
    // aria-hidden: this is a visual restatement of the "7 / 10" text right
    // beside it. Announcing twelve individual dots would be noise.
    <div aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        // Filled dots are plain light grey, NOT lime. There can be twelve of
        // them on every card in a grid — rendered in the brand colour that's a
        // wall of glare, and it would compete with the one thing on screen that
        // should actually be lime (the primary action). See Badge.tsx.
        <span
          key={i}
          className={`size-1.5 rounded-full ${i < filled ? 'bg-content-muted' : 'bg-hover'}`}
        />
      ))}
    </div>
  )
}
