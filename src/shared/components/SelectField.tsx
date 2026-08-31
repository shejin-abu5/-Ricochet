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
 * The dropdown twin of FormField. Same shape, same ref-as-a-prop trick
 * (React 19 — no forwardRef needed), so it works with React Hook Form's
 * spread in exactly the same way:
 *
 *   <SelectField label="Format" {...register('format')} options={...} />
 *
 * Built as its own component rather than adding a `type="select"` branch to
 * FormField, because <select> is a genuinely different element with different
 * children (<option>s) — cramming both into one component would mean a pile
 * of conditionals and a props type where half the fields are irrelevant.
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
      {/**
       * The dropdown LIST that opens when you click a <select> is drawn by the
       * operating system, not by us — no amount of CSS here can style it. It
       * renders dark only because `color-scheme: dark` is set on <html> in
       * index.css. Without that one line, this control would look right until
       * you opened it, then flash a white native menu.
       *
       * That's why the project uses a real <select> rather than a custom
       * dropdown: native gives keyboard support, type-ahead, mobile wheel
       * pickers and screen-reader semantics for free. The skill's
       * `system-controls` rule — only build a custom control when branding
       * genuinely requires it.
       */}
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
