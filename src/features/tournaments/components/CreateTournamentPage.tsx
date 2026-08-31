import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useCreateTournament } from '../api/useTournaments'
import { createTournamentSchema, type CreateTournamentFormValues } from '../schemas'
import { playPeriodLabels, roundCount, slotOptions, type TournamentSlots } from '../types'

/**
 * "8 teams (3 rounds)" — telling the organiser what they're choosing.
 *
 * roundCount comes from types.ts, the same function the bracket view uses to
 * decide how many columns to draw. One definition of "how big is this
 * bracket", used by both the form that creates it and the view that renders
 * it, so the form can never promise a shape the bracket doesn't produce.
 */
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
  /**
   * Prefill the contact email with the organiser's own account email.
   *
   * A default that's right most of the time and editable when it isn't. This
   * reads the auth store rather than /api/me because it only needs the session
   * email, which the store already has — no request, no loading state, no
   * chance of the form rendering before it arrives.
   *
   * (Note the difference from the profile page in docs/11: there, the PAGE's
   * subject was server data that can go stale, so it used Query. Here it's a
   * one-off starting value for a text input. Different job, different source.)
   */
  const myEmail = useAuthStore((state) => state.user?.email)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTournamentFormValues>({
    resolver: zodResolver(createTournamentSchema),
    // The <select>s have inherent initial values, so RHF has to be told —
    // same rule as every other select in this project.
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

      {/* The "end before start" error is attached to THIS field by the
          `path: ['endDate']` in the schema's object-level .refine(). Without
          that path it would land on the object and render nowhere. */}
      <FormField
        label="End date"
        type="date"
        error={errors.endDate?.message}
        {...register('endDate')}
      />

      {/* type="time" gives the OS time picker on a phone, and hands back
          "18:00" — no date, no timezone, which is exactly what a daily kickoff
          time should be. */}
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

      {/* valueAsNumber: the DOM hands back "8", the schema wants the number 8.
          See the long note in features/teams/schemas.ts. */}
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
        {/* <legend> groups these two so a screen reader announces "Contact
            details: Phone" rather than a bare "Phone" floating after the slot
            picker. Same reason the colour radios use one in CreateTeamForm. */}
        <legend className="text-meta font-medium text-content">Contact details</legend>

        {/* inputMode="tel" brings up the phone keypad on mobile without the
            browser trying to validate the format itself — type="tel" does no
            validation anyway, so the real check is the Zod rule. */}
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
