import type { InputHTMLAttributes, Ref } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  // React Hook Form's register('fieldName') returns { name, onChange, onBlur, ref }
  // meant to land on the REAL <input> DOM node — RHF reads .value off that
  // node directly instead of tracking it in React state (that's what
  // "uncontrolled form" means, and why typing doesn't re-render anything).
  // Spreading register()'s output onto <FormField {...register('email')} />
  // means `ref` arrives here as a normal prop — which React 19 allows
  // without forwardRef, as long as we declare it and pass it through
  // to the actual <input> below.
  ref?: Ref<HTMLInputElement>
}

export function FormField({ label, error, id, ref, ...inputProps }: FormFieldProps) {
  const fieldId = id ?? inputProps.name
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      {/* A REAL <label>, not a placeholder. Placeholder-as-label disappears the
          moment someone types, so anyone who loses their place has to clear the
          field to find out what it wanted. It also isn't announced reliably by
          screen readers. The skill calls this `input-labels`. */}
      <label htmlFor={fieldId} className="text-meta font-medium text-content-muted">
        {label}
      </label>
      <input
        id={fieldId}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={errorId}
        /**
         * min-h-11 = 44px, the touch-target minimum. Inputs were 36px before
         * this pass, which is fiddly to hit on a phone.
         *
         * text-body (16px) rather than 14px is also deliberate: iOS Safari
         * auto-zooms the page when you focus an input smaller than 16px, which
         * yanks the whole layout sideways mid-typing.
         */
        className={`min-h-11 rounded-control border bg-raised px-3 text-body text-content placeholder:text-content-faint ${
          error ? 'border-danger' : 'border-border'
        }`}
        {...inputProps}
      />
      {/* role="alert" makes a screen reader announce the message the moment it
          appears, instead of the user tabbing past a field they can't see is
          broken. Rendered directly BELOW its field, not collected at the top of
          the form — the skill's `error-placement`. */}
      {error && (
        <p id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
