import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '../../../shared/components/FormField'
import { Button } from '../../../shared/components/Button'
import { useLogin } from '../api/useLogin'
import { loginSchema, type LoginFormValues } from '../schemas'

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const login = useLogin()

  const onSubmit = (data: LoginFormValues) => {
    login.mutate(data)
  }

  return (
    // noValidate hands validation entirely to Zod; without it the browser's own
    // popups compete with the field-level messages below.
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-sm flex-col gap-4">
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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {/* Field errors render under their input; a rejected request is about the
          submission as a whole, so it gets form-level placement instead. */}
      {login.error && (
        <p role="alert" className="text-meta text-danger">
          {login.error.message}
        </p>
      )}

      <Button type="submit" isLoading={login.isPending}>
        Log in
      </Button>
    </form>
  )
}
