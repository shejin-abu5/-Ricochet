interface PagePlaceholderProps {
  title: string
  description: string
}

/**
 * Stand-in so routing works end to end before a feature is built. Each usage is
 * replaced by a real page as the phases in docs/00-architecture.md land.
 */
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-display text-content">{title}</h1>
      <p className="mt-2 max-w-prose text-meta text-content-muted">{description}</p>
    </div>
  )
}
