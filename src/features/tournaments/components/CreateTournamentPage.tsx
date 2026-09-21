import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useCreateTournament } from '../api/useTournaments'
import { createTournamentSchema, type CreateTournamentFormValues } from '../schemas'
import { playPeriodLabels, roundCount, slotOptions, type TournamentSlots } from '../types'

// roundCount is the same function BracketView uses to decide how many columns
// to draw, so this label can never promise a shape the bracket will not produce.
const slotSelectOptions = slotOptions.map((slots: TournamentSlots) => ({
  value: String(slots),
  label: `${slots} teams (${roundCount(slots)} rounds)`,
}))

/** Built from the label map, so adding a period can't leave a dropdown stale. */
const playPeriodSelectOptions = Object.entries(playPeriodLabels).map(([value, label]) => ({
  value,
  label,
}))

function CreateTournamentForm() {
  // From the auth store rather than /api/me: this is a one-off starting value
  // for a text input, so there is no request, no loading state, and no chance of
  // the form rendering before it arrives.
  const myEmail = useAuthStore((state) => state.user?.email)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    // The selects have inherent initial values, so RHF has to be told.
    defaultValues: {
      slots: 8,
      playPeriod: 'day',
      startTime: '18:00',
      contactEmail: myEmail ?? '',
    },
  })

  const createTournament = useCreateTournament()

  return (
    <form
      onSubmit={handleSubmit((data) => createTournament.mutate(data))}
      noValidate
      className="flex w-full max-w-md flex-col gap-4"
    >
      <FormField
        label="Tournament name"
        placeholder="Kochi Summer Cup"
        error={errors.name?.message}
        {...register('name')}
      />

      <FormField
        label="Location"
        placeholder="Greenfield Turf, Kakkanad"
        error={errors.location?.message}
        {...register('location')}
      />

      <FormField
        label="Start date"
        type="date"
        error={errors.startDate?.message}
        {...register('startDate')}
      />

      {/* The "end before start" error reaches this field via `path` on the
          schema's object-level .refine(); without it, it renders nowhere. */}
      <FormField
        label="End date"
        type="date"
        error={errors.endDate?.message}
        {...register('endDate')}
      />

      <FormField
        label="Daily kickoff time"
        type="time"
        error={errors.startTime?.message}
        {...register('startTime')}
      />

      <SelectField
        label="Day or night"
        options={playPeriodSelectOptions}
        error={errors.playPeriod?.message}
        {...register('playPeriod')}
      />

      {/* valueAsNumber so the schema can stay z.union of number literals. */}
      <SelectField
        label="Number of teams"
        options={slotSelectOptions}
        error={errors.slots?.message}
        {...register('slots', { valueAsNumber: true })}
      />

      <p className="text-label text-content-muted">
        Knockout format. Only 4, 8 or 16 are offered so the bracket halves
        evenly every round and nobody gets a bye.
      </p>

      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        {/* <legend> so these announce as "Contact details: Phone" rather than a
            bare "Phone" floating after the slot picker. */}
        <legend className="text-meta font-medium text-content">Contact details</legend>

        {/* inputMode brings up the phone keypad; type="tel" does no validation
            of its own, so the Zod rule is the real check. */}
        <FormField
          label="Phone"
          type="tel"
          inputMode="tel"
          placeholder="+91 98470 11223"
          error={errors.contactPhone?.message}
          {...register('contactPhone')}
        />

        <FormField
          label="Email"
          type="email"
          error={errors.contactEmail?.message}
          {...register('contactEmail')}
        />

        <p className="text-label text-content-muted">
          Shown to logged-in players so they can reach you about entries. Not
          included on the page for logged-out visitors.
        </p>
      </fieldset>

      {createTournament.error && (
        <p role="alert" className="text-meta text-danger">
          {createTournament.error.message}
        </p>
      )}

      <Button type="submit" isLoading={createTournament.isPending}>
        Create tournament
      </Button>
    </form>
  )
}

export function CreateTournamentPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Create a tournament</h1>
      <p className="text-meta text-content-muted">You&rsquo;ll be the organiser.</p>
      <CreateTournamentForm />
    </div>
  )
}
