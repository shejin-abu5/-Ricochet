import { authHeaders } from '../../../shared/api/authHeaders'
import type { Team, TeamFilters } from '../types'
import type { CreateTeamFormValues, UpdateTeamFormValues } from '../schemas'

/**
 * Raw fetch calls for teams. Knows about HTTP, knows nothing about React —
 * the exact same split as features/matches/api/matchesApi.ts.
 *
 * By now this file should look almost copy-pasted, and that is the point of
 * Phase 3a: the interesting decisions were made in Phase 2. A new
 * feature should mostly be an application of patterns you already have, not a
 * fresh set of choices. When a new feature needs new patterns, that is worth
 * noticing and asking why.
 */

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

  // Separate message for 404, so "this team doesn't exist" doesn't send
  // someone off to check their wifi. Same as fetchMatch.
  if (response.status === 404) {
    throw new Error('That team does not exist.')
  }

  if (!response.ok) {
    throw new Error('Could not load this team. Please try again.')
  }

  return response.json()
}

/**
 * Update team settings. Captain only — the server returns 403 to anyone else.
 *
 * PATCH, not PUT: we're sending the fields that can change, not a whole
 * replacement resource. See the handler comment for why that distinction
 * matters for security as well as tidiness.
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
 * ASK to join a team. The captain approves or rejects.
 *
 * ---- THE RETURN TYPE CHANGED, AND THAT IS THE POINT ----
 *
 * This used to be `Promise<Team>` — you joined instantly and got the updated
 * team back. Now it resolves to nothing useful, because nothing has happened
 * yet: a pending request exists and somebody else has to act on it.
 *
 * `Promise<void>` is an honest signature here. Returning the pending request
 * object would invite a caller to write it into a cache as though it were
 * meaningful state, and it isn't — the only thing that matters is that the
 * team's `yourRequestStatus` is now 'pending', which comes from a refetch.
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
    // Both headers now: the content type AND the token. The server needs the
    // token to know who becomes captain.
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // The server's message matters here — "a team with that name already
    // exists" is something only the server can know.
    throw new Error(body?.message ?? 'Could not create the team. Please try again.')
  }

  return response.json()
}
