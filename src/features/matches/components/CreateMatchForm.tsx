import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { SelectField } from '../../../shared/components/SelectField'
import { TextareaField } from '../../../shared/components/TextareaField'
import { Button } from '../../../shared/components/Button'
import { useCreateMatch } from '../api/useCreateMatch'
import { createMatchSchema, type CreateMatchFormValues } from '../schemas'

const formatOptions = [
  { value: '5v5', label: '5-a-side (10 players)' },
  { value: '7v7', label: '7-a-side (14 players)' },
  { value: '11v11', label: '11-a-side (22 players)' },
]

const skillOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export function CreateMatchForm() {
  // defaultValues matters for the selects: without it they would display
  // their first option while RHF still believed the field was empty, failing
  // validation over a value the user can see.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMatchFormValues>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      format: '5v5',
      skillLevel: 'intermediate',
    },
  })

  const createMatch = useCreateMatch()

  const onSubmit = (data: CreateMatchFormValues) => {
    createMatch.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex w-full max-w-md flex-col gap-4"
    >
      <FormField
        label="Match title"
        placeholder="Sunday Turf Kickabout"
        error={errors.title?.message}
        {...register('title')}
      />

      <FormField
        label="Location"
        placeholder="Greenfield Turf, Kakkanad"
        error={errors.location?.message}
        {...register('location')}
      />

      {/* Native picker — on a phone this is the OS one people already know. */}
      <FormField
        label="Date & time"
        type="datetime-local"
        error={errors.dateTime?.message}
        {...register('dateTime')}
      />

      <SelectField
        label="Format"
        options={formatOptions}
        error={errors.format?.message}
        {...register('format')}
      />

      <SelectField
        label="Skill level"
        options={skillOptions}
        error={errors.skillLevel?.message}
        {...register('skillLevel')}
      />

      <TextareaField
        label="Notes (optional)"
        placeholder="Bibs provided, turf shoes only, we usually grab food after…"
        hint="Anything players should know before turning up."
        error={errors.notes?.message}
        {...register('notes')}
      />

      {/* Duplicated with the toast in useCreateMatch on purpose: a toast is gone
          in seconds, and the reason needs to stay up while the user fixes it. */}
      {createMatch.error && (
        <p role="alert" className="text-meta text-danger">
          {createMatch.error.message}
        </p>
      )}

      <Button type="submit" isLoading={createMatch.isPending}>
        Create match
      </Button>
    </form>
  )
}
