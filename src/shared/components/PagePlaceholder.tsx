interface PagePlaceholderProps {
  title: string
  description: string
}

/**
 * Temporary stand-in so routing works end-to-end before each feature
 * is built. We'll replace each usage of this with a real page as we
 * work through docs/00-architecture.md's phases.
 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-display text-content">{title}</h1>
      {/* max-w-prose caps the line length. A sentence running the full width of
          a 1440px monitor is measurably harder to read — the eye loses its
          place tracking back to the start of the next line. */}
      <p className="mt-2 max-w-prose text-meta text-content-muted">{description}</p>
    </div>
  )
}
