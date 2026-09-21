interface SkeletonProps {
  className?: string
}

/**
 * Placeholder shown while data loads.
 *
 * Skeletons rather than a spinner (docs/03): the placeholder occupies the space
 * the real content will take, so nothing jumps when it arrives.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      // bg-raised is one step LIGHTER than the card it sits on: in a dark theme
      // the light-theme instinct of a darker grey reads as a hole in the page.
      //
      // aria-hidden because callers put aria-busy on the container instead —
      // announcing each box would be a stream of meaningless empties.
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-raised ${className}`}
    />
  )
}
