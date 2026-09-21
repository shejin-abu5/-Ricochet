interface SlotDotsProps {
  /** How many slots are taken. */
  filled: number
  /** How many slots exist in total. */
  total: number
}

/**
 * One dot per slot, filled for each player who has joined.
 *
 * Dots rather than a progress bar because the count is the actionable fact:
 * "two spots left" is a decision, "80% full" is arithmetic homework.
 */
export function SlotDots({ filled, total }: SlotDotsProps) {
  // Beyond 12 (an 11v11 has 22) the dots are too small to read and too wide for
  // the detail page's 18rem sidebar. The "7 / 10" label beside them carries the
  // information instead, which is why callers always render it.
  if (total > 12) return null

  return (
    // aria-hidden: a visual restatement of the count text beside it. Announcing
    // twelve dots individually is noise.
    <div aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        // Grey, not lime: a dozen of these on every card in a grid would be a
        // wall of glare competing with the one lime action on screen.
        <span
          key={i}
          className={`size-1.5 rounded-full ${i < filled ? 'bg-content-muted' : 'bg-hover'}`}
        />
      ))}
    </div>
  )
}
