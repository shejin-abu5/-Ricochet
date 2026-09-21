import type { Ref, TextareaHTMLAttributes } from 'react'

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  /** Shown under the field. Persistent, unlike a placeholder. */
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

/**
 * The multi-line twin of FormField. Separate for the same reason SelectField
 * is: <textarea> has its own attributes, and one component for both leaves half
 * the props irrelevant in either mode.
 */
export function TextareaField({
  label,
  error,
  hint,
  id,
  ref,
  ...textareaProps
}: TextareaFieldProps) {
  const fieldId = id ?? textareaProps.name
  const errorId = error ? `${fieldId}-error` : undefined
  const hintId = hint ? `${fieldId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-meta font-medium text-content-muted">
        {label}
      </label>

      <textarea
        id={fieldId}
        ref={ref}
        rows={4}
        aria-invalid={!!error}
        // aria-describedby takes several space-separated ids, so hint and error
        // are both announced, in that order. `|| undefined` avoids emitting an
        // empty attribute when neither is present.
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        // resize-y, not both axes: dragging wider than the container breaks the
        // layout around it.
        className={`min-h-24 resize-y rounded-control border bg-raised px-3 py-2 text-body text-content placeholder:text-content-faint ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...textareaProps}
      />

      {hint && !error && (
        <p id={hintId} className="text-label text-content-faint">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
