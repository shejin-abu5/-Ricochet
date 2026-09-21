import type { InputHTMLAttributes, Ref } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  /**
   * Declared so React Hook Form's register() spread can reach the real DOM
   * node — RHF reads .value off it directly rather than through React state.
   * React 19 passes `ref` as an ordinary prop, so no forwardRef is needed, but
   * it does have to be declared and forwarded explicitly.
   */
  ref?: Ref<HTMLInputElement>
}

export function FormField({ label, error, id, ref, ...inputProps }: FormFieldProps) {
  const fieldId = id ?? inputProps.name
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {/* A real label, not a placeholder: placeholder-as-label vanishes the
          moment someone types, and is not reliably announced. */}
      <label htmlFor={fieldId} className="text-meta font-medium text-content-muted">
        {label}
      </label>
      <input
        id={fieldId}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={errorId}
        // min-h-11 is the 44px touch-target minimum, and text-body is 16px
        // because iOS Safari auto-zooms into any input with a smaller font,
        // yanking the layout sideways mid-typing.
        className={`min-h-11 rounded-control border bg-raised px-3 text-body text-content placeholder:text-content-faint ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...inputProps}
      />
      {/* role="alert" announces the message as it appears, rather than leaving
          someone to tab past a field they cannot see is broken. */}
      {error && (
        <p id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
