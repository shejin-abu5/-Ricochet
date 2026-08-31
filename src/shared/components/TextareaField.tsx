import type { Ref, TextareaHTMLAttributes } from 'react'

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  /** Shown under the field. Persistent, unlike a placeholder. */
  hint?: string
  ref?: Ref<HTMLTextAreaElement>
}

/**
 * The multi-line twin of FormField.
 *
 * Built as its own component rather than a `multiline` branch inside FormField,
 * for the same reason SelectField is separate: <textarea> is a genuinely
 * different element with different attributes (rows, resize behaviour), and
 * cramming both into one component means a props type where half the fields
 * are irrelevant to whichever mode you're in.
 *
 * `ref` arrives as a normal prop — React 19, no forwardRef needed — so React
 * Hook Form's register() spread works exactly as it does on the other fields.
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
        /**
         * aria-describedby can hold SEVERAL ids, space-separated — so a screen
         * reader reads the hint and the error, in that order. `.filter(Boolean)`
         * drops the ones that aren't present; `|| undefined` avoids emitting an
         * empty attribute when neither is.
         */
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        // resize-y, not resize (both axes): letting someone drag a textarea
        // wider than its container breaks the layout around it.
        className={`min-h-24 resize-y rounded-control border bg-raised px-3 py-2 text-body text-content placeholder:text-content-faint ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...textareaProps}
      />

      {/* A persistent hint, not a placeholder. Placeholder text vanishes the
          moment someone types — exactly when guidance is most useful. */}
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
