import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { avatarColours, type AvatarColour } from '../../../shared/components/avatarColours'
import { useCreateTeam } from '../api/useCreateTeam'
import { createTeamSchema, type CreateTeamFormValues } from '../schemas'

/**
 * Built with a loop rather than seven hand-written <option> tags. Less to
 * read, and impossible to end up with "4 times a week" sitting at value="5"
 * because someone copy-pasted a line and missed a digit.
 */
const playsPerWeekOptions = Array.from({ length: 7 }, (_, i) => {
  const times = i + 1
  return { value: String(times), label: times === 1 ? 'Once a week' : `${times} times a week` }
})

export function CreateTeamForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    // The colour radios and the <select> both have an inherent initial value,
    // so RHF needs to be told about them — same rule as CreateMatchForm.
    defaultValues: { colour: 'emerald', playsPerWeek: 2 },
  })

  const createTeam = useCreateTeam()

  /**
   * ============================================================
   *  READING VALUES AS YOU TYPE — the new RHF idea this phase
   * ============================================================
   *
   * Every form so far has been WRITE-ONLY: type things, submit, done. The
   * component never needed to know what was in the fields — which is exactly
   * why RHF is fast. It leaves values in the DOM and does not re-render on
   * keystrokes.
   *
   * The live badge preview below needs the opposite: it has to re-render as
   * you type. So you deliberately give up that advantage for these two fields.
   *
   * ---- WHY `useWatch` AND NOT `watch` ----
   *
   * RHF offers both. `watch('name')` does the same job in one less line, and
   * it is what most tutorials show. It is worse here for two reasons:
   *
   *   1. `watch` re-renders THIS ENTIRE COMPONENT on every keystroke — every
   *      field, every swatch, the button, all of it. `useWatch` subscribes
   *      more narrowly. On a form this size neither is noticeable; on a
   *      30-field form the difference is very noticeable.
   *
   *   2. Our linter flags `watch` outright: React Compiler cannot safely
   *      memoize a component that uses it, so it silently skips optimising
   *      this component altogether. Run `npm run lint` after switching this
   *      back to `watch` and you can watch the warning appear.
   *
   * That second one is worth internalising: React Compiler works by proving
   * things about your code. APIs it cannot reason about do not break — they
   * just quietly opt you out of the optimisation.
   */
  const name = useWatch({ control, name: 'name' })
  const colour = useWatch({ control, name: 'colour' }) as AvatarColour

  const onSubmit = (data: CreateTeamFormValues) => {
    createTeam.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-md flex-col gap-4"
    >
      <FormField
        label="Team name"
        placeholder="Kochi United"
        error={errors.name?.message}
        {...register('name')}
      />

      <FormField
        label="Home location"
        placeholder="Kakkanad"
        error={errors.location?.message}
        {...register('location')}
      />

      <FormField
        label="Home ground"
        placeholder="Greenfield Turf, Kakkanad"
        error={errors.homeGround?.message}
        {...register('homeGround')}
      />

      {/* valueAsNumber converts "3" → 3 as the value leaves the input, so the
          Zod schema can be a plain z.number(). See the long note in
          schemas.ts for why this beats z.coerce.number(). */}
      <SelectField
        label="How often do you play?"
        options={playsPerWeekOptions}
        error={errors.playsPerWeek?.message}
        {...register('playsPerWeek', { valueAsNumber: true })}
      />

      <fieldset className="flex flex-col gap-2">
        {/* <legend> is the accessible label for a GROUP of inputs. A plain
            <label> can only point at one control, so radio groups need this —
            otherwise a screen reader reads six unlabelled radios with no idea
            what they are choosing between. */}
        <legend className="text-meta font-medium text-content">Badge colour</legend>

        <div className="flex flex-wrap gap-2">
          {avatarColours.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-control border p-1 transition-colors ${
                colour === option ? 'border-primary' : 'border-transparent'
              }`}
            >
              {/* sr-only hides the radio visually but keeps it in the
                  accessibility tree and keyboard tab order — the swatch beside
                  it IS the visual control. Using `display: none` or removing
                  the input would make this unusable without a mouse. */}
              <input
                type="radio"
                value={option}
                className="sr-only"
                {...register('colour')}
              />
              <Avatar name={name || 'Team'} colour={option} size="md" />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
        <Avatar name={name || 'Team name'} colour={colour} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{name || 'Team name'}</p>
          <p className="text-meta text-content-muted">0 members · 0W 0L 0D</p>
        </div>
      </div>

      {createTeam.error && (
        <p role="alert" className="text-meta text-danger">
          {createTeam.error.message}
        </p>
      )}

      <Button type="submit" isLoading={createTeam.isPending}>
        Create team
      </Button>
    </form>
  )
}
