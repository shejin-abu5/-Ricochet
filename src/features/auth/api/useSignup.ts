import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { signup } from './authApi'
import { useAuthStore } from '../authStore'
import type { SignupFormValues } from '../schemas'

export function useSignup() {
  const navigate = useNavigate()
  const setCredentials = useAuthStore((state) => state.setCredentials)

  return useMutation({
    // confirmPassword is dropped here rather than in the form, so the schema
    // stays the single description of the form and the API stays the single
    // description of the request.
    mutationFn: ({ confirmPassword: _confirmPassword, ...data }: SignupFormValues) => signup(data),

    onSuccess: (data) => {
      setCredentials(data.user, data.token)
      navigate('/')
    },
  })
}
