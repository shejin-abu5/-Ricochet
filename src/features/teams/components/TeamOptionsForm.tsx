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

export function TeamOptionsForm({ team }: TeamOptionsFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateTeamFormValues>({
    resolver: zodResolver(updateTeamSchema),

    /*
     * defaultValues is read once, when useForm first runs. That is safe here
     * only because ManageTeamPage renders a skeleton until the query resolves,
     * so `team` is already real by the time this mounts. Rendered while team
     * was undefined, the form would capture empty defaults and stay blank when
     * the data arrived, with nothing erroring.
     *
     * A form that must stay live against changing data wants `values` instead,
     * which RHF re-syncs.
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
      // Runs in addition to the hook's own onSuccess. reset(data) makes the
      // submitted values the new baseline, so isDirty clears and Save disables.
      // Form-specific cleanup stays out of the shared hook.
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

      {/* A live Save button with nothing changed invites pointless requests and
          leaves people unsure whether the edit registered. */}
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
