import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Optional call-to-action, e.g. a "Clear filters" button. */
  action?: ReactNode
}

/**
 * Shown when a list has zero results — an explanation plus, usually, a way out.
 *
 * Not an error state: empty means the request worked and there is nothing,
 * error means it failed. Callers keep the two separate.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    // Dashed rather than solid: reads as "a space where something would go"
    // instead of "a card with nothing in it".
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong p-8 text-center">
      <p className="text-title text-content">{title}</p>
      {description && <p className="text-meta text-content-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
