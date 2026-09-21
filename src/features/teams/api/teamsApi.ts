import { authHeaders } from '../../../shared/api/authHeaders'
import type { Team, TeamFilters } from '../types'
import type { CreateTeamFormValues, UpdateTeamFormValues } from '../schemas'

export async function fetchTeams(filters: TeamFilters): Promise<Team[]> {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)

  const queryString = params.toString()
  const url = queryString ? `/api/teams?${queryString}` : '/api/teams'

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Could not load teams. Please try again.')
  }

  return response.json()
}

export async function fetchTeam(id: string): Promise<Team> {
  const response = await fetch(`/api/teams/${id}`)

  // "Doesn't exist" and "request failed" send the user to different places.
  if (response.status === 404) {
    throw new Error('That team does not exist.')
  }

  if (!response.ok) {
    throw new Error('Could not load this team. Please try again.')
  }

  return response.json()
}

/**
 * Updates team settings. Captain only — the server 403s anyone else.
 *
 * PATCH, not PUT: this sends the fields that may change, not a whole
 * replacement resource, so a client cannot blank a field it never sent.
 */
export async function updateTeam(id: string, data: UpdateTeamFormValues): Promise<Team> {
  const response = await fetch(`/api/teams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not save your changes. Please try again.')
  }

  return response.json()
}

/**
 * Asks to join a team; the captain approves or rejects.
 *
 * Resolves to void deliberately. Nothing has happened yet — returning the
 * pending request would invite callers to cache it as meaningful state, when
 * the only thing that matters is that `yourRequestStatus` is now 'pending'.
 */
export async function requestToJoinTeam(id: string): Promise<void> {
  const response = await fetch(`/api/teams/${id}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not send your request. Please try again.')
  }
}

export async function leaveTeam(id: string): Promise<Team> {
  const response = await fetch(`/api/teams/${id}/join`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not leave this team. Please try again.')
  }

  return response.json()
}

export async function createTeam(data: CreateTeamFormValues): Promise<Team> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    // The token is what tells the server who becomes captain.
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // Prefer the server's message: only it knows "that name is taken".
    throw new Error(body?.message ?? 'Could not create the team. Please try again.')
  }

  return response.json()
}
