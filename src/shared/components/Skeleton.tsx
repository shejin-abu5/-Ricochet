interface SkeletonProps {
  className?: string
}

/**
 * A grey shimmering placeholder shown while data loads.
 *
 * WHY SKELETONS INSTEAD OF A SPINNER (docs/03-uiux-design-brief.md asks for
 * this deliberately): a spinner says "something is happening somewhere". A
 * skeleton says "three match cards are arriving, and they'll look like this".
 * The page doesn't jump around when real data replaces it, because the
 * placeholder already occupies the right space. It measurably *feels* faster
 * even when it isn't.
 *
 * `animate-pulse` is Tailwind's built-in fade in/out animation.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      /**
       * `bg-raised` — one step lighter than the card it sits on. In a dark
       * theme a placeholder has to be LIGHTER than its surface to read as
       * "something is coming"; the light-theme instinct of a slightly darker
       * grey just looks like a hole in the page.
       *
       * aria-hidden because a skeleton is pure visual scaffolding. Announcing
       * it would read as a stream of meaningless empty boxes; the loading
       * state is communicated by aria-busy on the container instead.
       */
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-raised ${className}`}
    />
  )
}
