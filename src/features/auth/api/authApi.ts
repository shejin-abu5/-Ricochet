import type { AuthUser } from '../authStore'
import type { LoginFormValues, SignupFormValues } from '../schemas'

interface AuthResponse {
  user: AuthUser
  token: string
}

/**
 * Unwraps an auth response, converting HTTP error statuses into thrown Errors.
 *
 * fetch only rejects on network failure — a 401 or 409 resolves normally, so
 * without this check `useMutation`'s onError would fire for "the internet is
 * down" but not for "wrong password".
 */
async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const body = await response.json()

  if (!response.ok) {
    throw new Error(body.message ?? 'Something went wrong. Please try again.')
  }

  return body as AuthResponse
}

export async function login(credentials: LoginFormValues): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  return parseAuthResponse(response)
}

// confirmPassword exists only for client-side validation, so the request body
// type excludes it rather than sending a field the server would ignore.
export async function signup(
  data: Omit<SignupFormValues, 'confirmPassword'>
): Promise<AuthResponse> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return parseAuthResponse(response)
}
