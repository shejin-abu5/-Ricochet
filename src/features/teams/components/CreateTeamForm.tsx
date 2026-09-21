import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { avatarColours, type AvatarColour } from '../../../shared/components/avatarColours'
import { useCreateTeam } from '../api/useCreateTeam'
import { createTeamSchema, type CreateTeamFormValues } from '../schemas'

// Generated rather than hand-written, so a label and its value cannot drift.
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
   * The live badge preview has to re-render as you type, which gives up the
   * uncontrolled-form advantage for these two fields only.
   *
   * useWatch rather than watch: watch re-renders the whole component on every
   * keystroke, and the linter flags it because React Compiler cannot memoize a
   * component that uses it — it silently skips optimising this file instead of
   * failing.
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

      {/* valueAsNumber converts at the form boundary so the schema can stay a
          plain z.number() — see schemas.ts. */}
      <SelectField
        label="How often do you play?"
        options={playsPerWeekOptions}
        error={errors.playsPerWeek?.message}
        {...register('playsPerWeek', { valueAsNumber: true })}
      />

      <fieldset className="flex flex-col gap-2">
        {/* <legend> labels the GROUP; a <label> can only point at one control,
            so without it this is six unlabelled radios. */}
        <legend className="text-meta font-medium text-content">Badge colour</legend>

        <div className="flex flex-wrap gap-2">
          {avatarColours.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-control border p-1 transition-colors ${
                colour === option ? 'border-primary' : 'border-transparent'
              }`}
            >
              {/* sr-only, not display:none — the swatch is the visual control,
                  but the radio has to stay focusable and announceable. */}
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
