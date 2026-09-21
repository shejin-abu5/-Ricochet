import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { login } from './authApi'
import { useAuthStore } from '../authStore'
import type { LoginFormValues } from '../schemas'

export function useLogin() {
  const navigate = useNavigate()
  const setCredentials = useAuthStore((state) => state.setCredentials)

  return useMutation({
    mutationFn: (credentials: LoginFormValues) => login(credentials),
    onSuccess: (data) => {
      setCredentials(data.user, data.token)
      navigate('/')
    },
    // No onError: LoginForm renders `login.error` directly, so handling it
    // here as well would surface the same failure twice.
  })
}
