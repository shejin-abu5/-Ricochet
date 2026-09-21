import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { Button } from '../../../shared/components/Button'
import { useSignup } from '../api/useSignup'
import { signupSchema, type SignupFormValues } from '../schemas'

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const signup = useSignup()

  const onSubmit = (data: SignupFormValues) => {
    signup.mutate(data)
  }

  return (
    // noValidate hands validation entirely to Zod; without it the browser's own
    // popups compete with the field-level messages below.
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-sm flex-col gap-4">
      <FormField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />

      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {/* errors.confirmPassword is populated by the cross-field .refine() in
          schemas.ts, not by a rule on this field. */}
      <FormField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {/* Field errors render under their input; a rejected request is about the
          submission as a whole, so it gets form-level placement instead. */}
      {signup.error && (
        <p role="alert" className="text-meta text-danger">
          {signup.error.message}
        </p>
      )}

      <Button type="submit" isLoading={signup.isPending}>
        Sign up
      </Button>
    </form>
  )
}
