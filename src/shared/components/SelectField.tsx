import type { Ref, SelectHTMLAttributes } from 'react'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Option[]
  error?: string
  ref?: Ref<HTMLSelectElement>
}

/**
 * The dropdown twin of FormField.
 *
 * Separate rather than a `type="select"` branch inside FormField, because
 * <select> takes different children and different attributes — one component
 * for both means a props type where half the fields are irrelevant.
 */
export function SelectField({
  label,
  options,
  error,
  id,
  ref,
  ...selectProps
}: SelectFieldProps) {
  const fieldId = id ?? selectProps.name
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-meta font-medium text-content-muted">
        {label}
      </label>
      {/* The open list is drawn by the OS and no CSS here reaches it — it
          renders dark only because index.css sets `color-scheme: dark`. Without
          that line this control looks right until you open it, then flashes a
          white native menu. */}
      <select
        id={fieldId}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={`min-h-11 rounded-control border bg-raised px-3 text-body text-content ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
