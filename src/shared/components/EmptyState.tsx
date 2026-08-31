import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Optional call-to-action, e.g. a "Clear filters" button. */
  action?: ReactNode
}

/**
 * Shown when a list has zero results.
 *
 * Worth building as its own component rather than an inline `<p>No results</p>`:
 * an empty list is a real UI state that deserves an explanation and usually a
 * way out. "No matches found" alone is a dead end; "No matches found — try
 * clearing your filters" plus a button is recoverable.
 *
 * Note this is NOT the same as an error state. Empty means "the request
 * worked, there just isn't anything". Error means "the request failed".
 * Conflating them confuses users, so MatchList.tsx keeps them separate.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    // Dashed border rather than solid: it reads as "a space where something
    // would go" instead of "a card with nothing in it". Small distinction,
    // but it's the difference between looking empty and looking broken.
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong p-8 text-center">
      <p className="text-title text-content">{title}</p>
      {description && <p className="text-meta text-content-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
