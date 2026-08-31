import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { avatarColours, type AvatarColour } from '../../../shared/components/avatarColours'
import { useUpdateTeam } from '../api/useUpdateTeam'
import { updateTeamSchema, type UpdateTeamFormValues } from '../schemas'
import type { Team } from '../types'

interface TeamOptionsFormProps {
  team: Team
}

const playsPerWeekOptions = Array.from({ length: 7 }, (_, i) => {
  const times = i + 1
  return { value: String(times), label: times === 1 ? 'Once a week' : `${times} times a week` }
})

/**
 * Edit team settings. Structurally the same as CreateTeamForm — same schema,
 * same fields — with one genuinely new problem.
 */
export function TeamOptionsForm({ team }: TeamOptionsFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateTeamFormValues>({
    resolver: zodResolver(updateTeamSchema),

    /**
     * ============================================================
     *  PRE-FILLING A FORM WITH DATA THAT ARRIVES LATER
     * ============================================================
     *
     * `defaultValues` is read ONCE, when useForm first runs. That's usually
     * invisible — CreateTeamForm's defaults are constants — but here the
     * values come from a server fetch, and there is a trap in the timing.
     *
     * If this component rendered while `team` was still undefined, useForm
     * would capture empty defaults, and when the data arrived a moment later
     * the form would STILL BE BLANK. Nothing errors; the fields are just
     * empty, and it looks like the API returned nothing.
     *
     * Two ways out:
     *
     *   1. Don't render the form until the data exists. ManageTeamPage does
     *      exactly that — it returns a skeleton while the query is pending, so
     *      by the time this component mounts, `team` is real. Simplest, and
     *      the reason this file can use plain `defaultValues`.
     *
     *   2. Pass `values: {...}` instead. RHF re-syncs the form whenever that
     *      object changes — the right tool when a form must stay live against
     *      data that can update underneath it.
     *
     * Option 1 whenever you can: a component that only renders with the data
     * it needs has one less state to reason about.
     */
    defaultValues: {
      name: team.name,
      location: team.location,
      homeGround: team.homeGround,
      playsPerWeek: team.playsPerWeek,
      colour: team.colour,
    },
  })

  const updateTeamMutation = useUpdateTeam(team.id)

  const name = useWatch({ control, name: 'name' })
  const colour = useWatch({ control, name: 'colour' }) as AvatarColour

  const onSubmit = (data: UpdateTeamFormValues) => {
    updateTeamMutation.mutate(data, {
      /**
       * A SECOND onSuccess, passed to .mutate() rather than to useMutation.
       *
       * Both run. The one in useUpdateTeam is about shared consequences (cache,
       * toast) and belongs with the mutation. This one is about THIS FORM —
       * `reset(data)` tells RHF the submitted values are now the baseline, so
       * `isDirty` flips back to false and the Save button disables again.
       *
       * Putting form-specific cleanup in the shared hook would mean the hook
       * needing a reference to a form it shouldn't know exists.
       */
      onSuccess: () => reset(data),
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={name || team.name} colour={colour} size="lg" />
        <p className="text-meta text-content-muted">Live preview</p>
      </div>

      <FormField label="Team name" error={errors.name?.message} {...register('name')} />

      <FormField
        label="Home location"
        error={errors.location?.message}
        {...register('location')}
      />

      <FormField
        label="Home ground"
        error={errors.homeGround?.message}
        {...register('homeGround')}
      />

      <SelectField
        label="How often do you play?"
        options={playsPerWeekOptions}
        error={errors.playsPerWeek?.message}
        // valueAsNumber: the DOM hands back "3", the schema wants 3.
        {...register('playsPerWeek', { valueAsNumber: true })}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-meta font-medium text-content">Badge colour</legend>
        <div className="flex flex-wrap gap-2">
          {avatarColours.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-control border p-1 transition-colors ${
                colour === option ? 'border-primary' : 'border-transparent'
              }`}
            >
              <input type="radio" value={option} className="sr-only" {...register('colour')} />
              <Avatar name={name || team.name} colour={option} size="md" />
            </label>
          ))}
        </div>
      </fieldset>

      {updateTeamMutation.error && (
        <p role="alert" className="text-meta text-danger">
          {updateTeamMutation.error.message}
        </p>
      )}

      {/**
       * `isDirty` is RHF comparing current values against the defaults. A Save
       * button that's live when nothing has changed invites pointless requests
       * and leaves people unsure whether their edit registered.
       */}
      <Button
        type="submit"
        disabled={!isDirty}
        isLoading={updateTeamMutation.isPending}
      >
        {isDirty ? 'Save changes' : 'Saved'}
      </Button>
    </form>
  )
}
